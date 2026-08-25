import {
  CreateChannelCommand,
  GetStreamCommand,
  StopStreamCommand,
  DeleteChannelCommand,
} from "@aws-sdk/client-ivs";

import { ivsClient } from "../config/ivs.js";

const sanitizeChannelName = (value) => {
  return value
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 128);
};

export const createIvsChannel = async ({
  sessionId,
  instructorId,
}) => {
  const channelName = sanitizeChannelName(
    `learnify-${instructorId}-${sessionId}`
  );

  const command = new CreateChannelCommand({
    name: channelName,

    // STANDARD supports adaptive video quality.
    type: "STANDARD",

    // Suitable for YouTube-style live classes.
    latencyMode: "LOW",

    // Development version.
    // We will add private playback authorization later.
    authorized: false,

    tags: {
      application: "learnify",
      sessionId: sessionId.toString(),
      instructorId: instructorId.toString(),
    },
  });

  const response = await ivsClient.send(command);

  if (
    !response.channel?.arn ||
    !response.channel?.playbackUrl ||
    !response.channel?.ingestEndpoint ||
    !response.streamKey?.value
  ) {
    throw new Error(
      "Amazon IVS did not return complete channel information"
    );
  }

  return {
    channelArn: response.channel.arn,
    channelName: response.channel.name,
    playbackUrl: response.channel.playbackUrl,
    ingestEndpoint: response.channel.ingestEndpoint,

    streamKeyArn: response.streamKey.arn,

    // Secret: return this only to the instructor.
    streamKeyValue: response.streamKey.value,
  };
};

export const getIvsStream = async (channelArn) => {
  try {
    const response = await ivsClient.send(
      new GetStreamCommand({
        channelArn,
      })
    );

    return {
      isLive: true,
      streamId: response.stream?.streamId ?? null,
      state: response.stream?.state ?? null,
      health: response.stream?.health ?? null,
      viewerCount: response.stream?.viewerCount ?? 0,
      startedAt: response.stream?.startTime ?? null,
    };
  } catch (error) {
    if (error.name === "ChannelNotBroadcasting") {
      return {
        isLive: false,
        viewerCount: 0,
      };
    }

    throw error;
  }
};

export const stopIvsStream = async (channelArn) => {
  try {
    await ivsClient.send(
      new StopStreamCommand({
        channelArn,
      })
    );

    return {
      stopped: true,
    };
  } catch (error) {
    if (error.name === "ChannelNotBroadcasting") {
      return {
        stopped: true,
        alreadyStopped: true,
      };
    }

    throw error;
  }
};

export const deleteIvsChannel = async (channelArn) => {
  if (!channelArn) {
    throw new Error("IVS channel ARN is required");
  }

  await stopIvsStream(channelArn);

  await ivsClient.send(
    new DeleteChannelCommand({
      arn: channelArn,
    })
  );

  return {
    deleted: true,
  };
};