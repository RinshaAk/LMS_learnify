import assert from "node:assert/strict";
import { beforeEach, afterEach, describe, it } from "node:test";
import {
  __resetLiveServiceDependenciesForTest,
  __setLiveServiceDependenciesForTest,
  cancelLiveSessionService,
  deleteLiveSessionService,
  endLiveSessionService,
  getLiveSessionStatusService,
  startLiveSessionService,
  watchLiveSessionService,
} from "../services/liveServices.js";

class Query {
  constructor(value) {
    this.value = value;
  }

  select() {
    return this;
  }

  populate() {
    return this;
  }

  sort() {
    return this;
  }

  then(resolve, reject) {
    return Promise.resolve(this.value).then(resolve, reject);
  }
}

class FakeSession {
  constructor(data, store) {
    Object.assign(this, data);
    this.store = store;
    this.saveCount = 0;
  }

  async save() {
    this.saveCount += 1;

    if (this.failOnSaveNumber === this.saveCount) {
      throw new Error("Mongo save failed");
    }

    this.store.set(this._id, this);
    return this;
  }

  toObject() {
    const { store, failOnSaveNumber, saveCount, ...plain } = this;
    return { ...plain };
  }
}

const makeHarness = () => {
  const sessions = new Map();
  const enrollments = [];
  const calls = {
    create: 0,
    getStream: 0,
    stop: [],
    delete: [],
    updates: [],
    deletedSessions: [],
  };

  const LiveSession = {
    findById: (id) => new Query(sessions.get(id) || null),
    findByIdAndUpdate: async (id, update) => {
      calls.updates.push({ id, update });
      const session = sessions.get(id);
      if (session) Object.assign(session, update);
      return session;
    },
    findByIdAndDelete: async (id) => {
      calls.deletedSessions.push(id);
      sessions.delete(id);
    },
  };

  const Enrollment = {
    findOne: async (criteria) => {
      return enrollments.find(
        (item) =>
          item.user === criteria.user &&
          item.course === criteria.course
      ) || null;
    },
  };

  const ivsOps = {
    createIvsChannel: async ({ sessionId }) => {
      calls.create += 1;
      return {
        channelArn: `arn:${sessionId}`,
        channelName: `channel-${sessionId}`,
        ingestEndpoint: "ingest.example.test",
        streamKeyArn: `stream-key:${sessionId}`,
        streamKeyValue: "one-time-secret",
        playbackUrl: "https://playback.example.test/index.m3u8",
      };
    },
    getIvsStream: async () => {
      calls.getStream += 1;
      return {
        isLive: false,
        viewerCount: 0,
      };
    },
    stopIvsStream: async (channelArn) => {
      calls.stop.push(channelArn);
      return { stopped: true };
    },
    deleteIvsChannel: async (channelArn) => {
      calls.delete.push(channelArn);
      return { deleted: true };
    },
  };

  __setLiveServiceDependenciesForTest({
    LiveSession,
    Enrollment,
    User: { findById: async () => ({ role: "instructor" }) },
    Course: { findById: async () => ({ instructor: "instructor-1" }) },
    getIo: () => ({ emit: () => {} }),
    sendEmail: async () => {},
    ivsOps,
  });

  return {
    sessions,
    enrollments,
    calls,
    ivsOps,
    addSession: (data) => {
      const session = new FakeSession(data, sessions);
      sessions.set(session._id, session);
      return session;
    },
  };
};

describe("liveServices IVS foundation", () => {
  let harness;

  beforeEach(() => {
    harness = makeHarness();
  });

  afterEach(() => {
    __resetLiveServiceDependenciesForTest();
  });

  it("starts an instructor's own scheduled session and returns one-time OBS details", async () => {
    harness.addSession({
      _id: "session-1",
      course: "course-1",
      instructor: "instructor-1",
      title: "Live Class",
      scheduledAt: new Date(),
      status: "scheduled",
    });

    const result = await startLiveSessionService({
      sessionId: "session-1",
      userId: "instructor-1",
    });

    const session = harness.sessions.get("session-1");
    assert.equal(session.status, "starting");
    assert.equal(session.ivsChannelArn, "arn:session-1");
    assert.equal(result.broadcast.serverUrl, "rtmps://ingest.example.test:443/app/");
    assert.equal(result.broadcast.streamKey, "one-time-secret");
    assert.equal(result.session.playbackUrl, undefined);
    assert.equal(result.session.streamKeyArn, undefined);
  });

  it("rejects another instructor with 403", async () => {
    harness.addSession({
      _id: "session-1",
      course: "course-1",
      instructor: "instructor-1",
      status: "scheduled",
    });

    await assert.rejects(
      startLiveSessionService({
        sessionId: "session-1",
        userId: "instructor-2",
      }),
      { statusCode: 403 }
    );
  });

  it("rejects duplicate starts when an IVS channel already exists", async () => {
    harness.addSession({
      _id: "session-1",
      course: "course-1",
      instructor: "instructor-1",
      status: "starting",
      ivsChannelArn: "arn:existing",
    });

    await assert.rejects(
      startLiveSessionService({
        sessionId: "session-1",
        userId: "instructor-1",
      }),
      { statusCode: 409 }
    );

    assert.equal(harness.calls.create, 0);
  });

  it("keeps a session starting before OBS broadcasts", async () => {
    harness.addSession({
      _id: "session-1",
      course: "course-1",
      instructor: "instructor-1",
      status: "starting",
      ivsChannelArn: "arn:session-1",
    });

    const status = await getLiveSessionStatusService({ sessionId: "session-1" });

    assert.equal(status.status, "starting");
    assert.equal(status.isLive, false);
  });

  it("changes status to live only after IVS reports broadcasting", async () => {
    harness.ivsOps.getIvsStream = async () => ({
      isLive: true,
      health: "HEALTHY",
      viewerCount: 12,
      startedAt: new Date("2026-01-01T00:00:00Z"),
    });
    __setLiveServiceDependenciesForTest({
      ivsOps: harness.ivsOps,
    });

    harness.addSession({
      _id: "session-1",
      course: "course-1",
      instructor: "instructor-1",
      status: "starting",
      ivsChannelArn: "arn:session-1",
      peakViewerCount: 0,
    });

    const status = await getLiveSessionStatusService({ sessionId: "session-1" });

    assert.equal(status.status, "live");
    assert.equal(status.isLive, true);
    assert.equal(harness.sessions.get("session-1").status, "live");
    assert.equal(harness.sessions.get("session-1").peakViewerCount, 12);
  });

  it("returns playback information for an enrolled student without broadcast secrets", async () => {
    harness.addSession({
      _id: "session-1",
      course: "course-1",
      instructor: "instructor-1",
      title: "Live Class",
      status: "starting",
      ivsChannelArn: "arn:session-1",
      playbackUrl: "https://playback.example.test/index.m3u8",
      ivsIngestEndpoint: "ingest.example.test",
      streamKeyArn: "secret-arn",
      chatEnabled: true,
      attendanceEnabled: true,
    });
    harness.enrollments.push({ user: "student-1", course: "course-1" });

    const result = await watchLiveSessionService({
      sessionId: "session-1",
      userId: "student-1",
      userRole: "student",
    });

    assert.equal(result.session.playbackUrl, "https://playback.example.test/index.m3u8");
    assert.equal(result.session.ivsIngestEndpoint, undefined);
    assert.equal(result.session.streamKeyArn, undefined);
    assert.equal(result.session.streamKeyValue, undefined);
  });

  it("returns 403 for a non-enrolled student", async () => {
    harness.addSession({
      _id: "session-1",
      course: "course-1",
      instructor: "instructor-1",
      status: "starting",
      playbackUrl: "https://playback.example.test/index.m3u8",
    });

    await assert.rejects(
      watchLiveSessionService({
        sessionId: "session-1",
        userId: "student-2",
        userRole: "student",
      }),
      { statusCode: 403 }
    );
  });

  it("ending an active session stops the mocked stream and re-ending is idempotent", async () => {
    harness.addSession({
      _id: "session-1",
      course: "course-1",
      instructor: "instructor-1",
      status: "live",
      ivsChannelArn: "arn:session-1",
      viewerCount: 7,
    });

    const ended = await endLiveSessionService({
      sessionId: "session-1",
      userId: "instructor-1",
    });
    const endedAgain = await endLiveSessionService({
      sessionId: "session-1",
      userId: "instructor-1",
    });

    assert.equal(ended.alreadyEnded, false);
    assert.equal(endedAgain.alreadyEnded, true);
    assert.deepEqual(harness.calls.stop, ["arn:session-1"]);
    assert.equal(harness.sessions.get("session-1").viewerCount, 0);
  });

  it("cleans up IVS when AWS succeeds but MongoDB save fails", async () => {
    harness.addSession({
      _id: "session-1",
      course: "course-1",
      instructor: "instructor-1",
      status: "scheduled",
      failOnSaveNumber: 2,
    });

    await assert.rejects(
      startLiveSessionService({
        sessionId: "session-1",
        userId: "instructor-1",
      }),
      /Mongo save failed/
    );

    assert.deepEqual(harness.calls.delete, ["arn:session-1"]);
    assert.equal(harness.sessions.get("session-1").status, "scheduled");
  });

  it("cancel and delete clean up IVS channels before changing database state", async () => {
    harness.addSession({
      _id: "cancel-session",
      course: "course-1",
      instructor: "instructor-1",
      status: "starting",
      ivsChannelArn: "arn:cancel",
    });
    harness.addSession({
      _id: "delete-session",
      course: "course-1",
      instructor: "instructor-1",
      status: "scheduled",
      ivsChannelArn: "arn:delete",
    });

    await cancelLiveSessionService({
      sessionId: "cancel-session",
      userId: "instructor-1",
      reason: "Reschedule",
    });
    await deleteLiveSessionService("instructor-1", "delete-session");

    assert.deepEqual(harness.calls.delete, ["arn:cancel", "arn:delete"]);
    assert.equal(harness.sessions.get("cancel-session").status, "cancelled");
    assert.equal(harness.sessions.has("delete-session"), false);
  });
});
