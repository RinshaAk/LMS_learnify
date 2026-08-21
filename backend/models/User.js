import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name:{
            type:String,
            required:true,
        },
        email:{
            type:String,
            required:true,
            unique:true,
        },
        password:{
            type:String,
            required:true,
        },
        googleId: {
            type: String,
            default: "",
        },
        authProviders: {
            type: [String],
            enum: ["password", "google"],
            default: ["password"],
        },
        role:{
            type:String,
            enum:["student","instructor","admin"],
            default:"student",
        },
        otp:{
            type:String,
        },
        otpExpiry:{
            type:Date,
        },
        isVerified:{
            type:Boolean,
            default:false,
        },
    profileImage: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    approvalStatus: {
      type: String,
      enum: ["unverified", "pending", "approved", "rejected"],
      default: "approved", 
    },
    verificationDetails: {
      age: { type: Number },
      education: { type: String },
      college: { type: String },
      degree: { type: String },
      graduationYear: { type: String },
      experience: { type: String },
      expertise: { type: String },
      certifications: [{ type: String }],
      documents: [{ type: String }],
    },
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedReason: {
      type: String,
      default: "",
    },
    blockedAt: {
      type: Date,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    },
    {timestamps:true}
);

export default mongoose.model("User",userSchema);
