import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { clearSelectedCourse } from "../../features/courses/courseSlice";
import { fetchCourseById as fetchCourseThunk, fetchEnrolledCourses, verifyPaymentAndEnroll } from "../../features/courses/courseThunk";
import paymentService from "../../services/paymentService";
import {
  Star,
  Users,
  Clock,
  Video,
  FileText,
  Award,
  ChevronRight,
  ShieldCheck,
  PlayCircle,
  CheckCircle2,
  Layers,
  Loader2,
  ArrowLeft,
} from "lucide-react";

const CourseDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [paymentLoading, setPaymentLoading] = useState(false);

  const {
    selectedCourse,
    loading,
    error,
    enrolledCourses
  } = useSelector((state) => state.courses);

  const { user } = useSelector((state) => state.auth);

  const course = selectedCourse?.details;

  useEffect(() => {
    dispatch(fetchCourseThunk(id));
    if (enrolledCourses.length === 0) {
      dispatch(fetchEnrolledCourses());
    }
    return () => dispatch(clearSelectedCourse());
  }, [dispatch, id]);

  // Check if student is already enrolled
  const isEnrolled = enrolledCourses?.some(item =>
    (item._id === id) || (item.course?._id === id) || (item.course === id)
  );

  // ================= PAYMENT =================

  const handlePayment = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/course-details/${id}` } });
      return;
    }

    try {
      setPaymentLoading(true);

      // 1. Create order on backend
      const data = await paymentService.createOrder(course._id);

      if (!data.success) {
        throw new Error(data.message || "Failed to create order");
      }

      // 2. Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: "INR",
        name: "StackVerseHub",
        description: `Purchase: ${course.title}`,
        image: course.thumbnail || "https://ui-avatars.com/api/?name=L&background=2563eb&color=fff",
        order_id: data.order.id,
        handler: async function (response) {
          try {
            setPaymentLoading(true);
            const verifyData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId: course._id,
            };

            // 3. Verify on backend
            const result = await dispatch(verifyPaymentAndEnroll(verifyData)).unwrap();

            if (result.success) {
              alert("Congratulations! Enrollment successful.");
              navigate("/student/courses");
            }
          } catch (error) {
            console.error("Verification error:", error);
            alert(error || "Payment verification failed. Please contact support.");
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
          contact: user.phone || ""
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: function () {
            setPaymentLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on("payment.failed", function (response) {
        alert("Payment failed: " + response.error.description);
        setPaymentLoading(false);
      });

    } catch (error) {
      console.error("Payment error:", error);
      alert(typeof error === 'string' ? error : "Failed to initiate payment. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  // ================= LOADING =================

  if (loading && !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading course details...</p>
      </div>
    );
  }

  // ================= ERROR =================

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 p-6">
        <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Oops! Something went wrong</h3>
          <p className="text-red-500 text-sm mt-2 font-medium">{error}</p>
          <button
            onClick={() => dispatch(fetchCourseThunk(id))}
            className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-xl active:scale-95 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="pb-20 space-y-10 animate-in fade-in duration-700">
      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-all group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Explore
      </button>

      {/* HERO SECTION */}
      <div className="relative rounded-[3rem] bg-slate-900 overflow-hidden text-white min-h-[500px] flex items-center shadow-2xl">
        <div className="absolute top-0 right-0 w-full lg:w-1/2 h-full">
          <img
            src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3"}
            className="w-full h-full object-cover opacity-30 lg:opacity-50"
            alt={course.title}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent"></div>
        </div>

        <div className="relative z-10 container mx-auto px-8 lg:px-16 py-20 space-y-8 max-w-5xl">
          <div className="flex flex-wrap gap-3">
            {course.isBestseller && (
              <span className="px-4 py-1.5 bg-yellow-500 text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                Bestseller
              </span>
            )}
            <span className="px-4 py-1.5 bg-blue-600/80 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-lg">
              {course.category || "General"}
            </span>
            <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-lg">
              {course.level || "Beginner"}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight max-w-3xl">
            {course.title}
          </h1>

          <p className="text-xl text-slate-300 leading-relaxed max-w-2xl font-medium">
            {course.description}
          </p>

          <div className="flex flex-wrap items-center gap-8 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center text-yellow-400">
                <Star size={20} fill="currentColor" />
                <span className="ml-2 text-xl font-black">{course.rating || 0}</span>
              </div>
              <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                ({course.reviewsCount || 0} reviews)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Users size={20} className="text-blue-400" />
              </div>
              <span className="text-slate-300 font-bold">
                {course.enrolledCount || 0}+ Students Enrolled
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <div className="relative">
              <img
                src={course.instructor?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(course.instructor?.name || "I")}&background=2563eb&color=fff`}
                className="w-14 h-14 rounded-2xl border-2 border-white/20 object-cover shadow-xl"
                alt={course.instructor?.name}
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <CheckCircle2 size={12} className="text-white" />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-1">Created By</p>
              <p className="text-lg font-bold hover:text-blue-400 transition-colors cursor-pointer">
                {course.instructor?.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid lg:grid-cols-3 gap-12 items-start">
        {/* LEFT SECTION */}
        <div className="lg:col-span-2 space-y-12">
          {/* WHAT YOU WILL LEARN */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150 group-hover:bg-blue-100 duration-700"></div>

            <h3 className="text-2xl font-bold text-slate-900 relative z-10">
              What you'll get in this course
            </h3>

            <div className="grid md:grid-cols-2 gap-6 relative z-10">
              {(course.features?.length > 0 ? course.features : [
                "Comprehensive video lectures",
                "Project-based learning",
                "Downloadable resources",
                "Full lifetime access",
                "Access on mobile and TV",
                "Certificate of completion"
              ]).map((feature, i) => (
                <div key={i} className="flex items-start gap-4 group/item">
                  <div className="w-6 h-6 rounded-lg bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:bg-green-600 group-hover/item:text-white transition-all">
                    <CheckCircle2 size={14} />
                  </div>
                  <p className="text-slate-600 font-bold text-sm tracking-tight">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CURRICULUM */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-bold text-slate-900">Course Curriculum</h3>
              <div className="flex items-center gap-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                <span>{course.lessons?.length || 0} Lessons</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span>{course.duration || "0h"} Total</span>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
              {course.lessons?.length > 0 ? (
                course.lessons.map((lesson, i) => (
                  <div key={lesson._id || i} className="p-8 hover:bg-slate-50 transition-all cursor-pointer group flex items-center justify-between">
                    <div className="flex items-center gap-8">
                      <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all text-xl shadow-inner">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {lesson.title}
                        </h4>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Video size={12} /> {lesson.type || "Video Lesson"}
                          </span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Clock size={12} /> {lesson.duration || "10 min"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:translate-x-1 transition-all">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="text-slate-200" size={40} />
                  </div>
                  <p className="text-slate-400 font-bold">No lessons have been added to this curriculum yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PURCHASE SIDEBAR */}
        <div className="space-y-8 sticky top-24">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600 rounded-bl-[4rem] -mr-10 -mt-10 opacity-10"></div>

            {/* THUMBNAIL PREVIEW */}
            <div className="relative aspect-video rounded-3xl overflow-hidden group shadow-lg">
              <img
                src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3"}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt="Preview"
              />
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center group-hover:bg-slate-900/20 transition-all">
                <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-blue-600 shadow-2xl scale-100 group-hover:scale-110 transition-transform">
                  <PlayCircle size={32} fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black text-center text-slate-900 uppercase tracking-widest shadow-xl">
                  Preview This Course
                </p>
              </div>
            </div>

            {/* PRICE & OFFERS */}
            <div className="space-y-4">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black text-slate-900 tracking-tighter">
                  ₹{course.price?.toLocaleString()}
                </span>
                <div className="pb-1.5 space-y-1">
                  <span className="block text-lg text-slate-400 line-through font-bold">
                    ₹{(course.price * 1.5).toLocaleString()}
                  </span>
                  <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded border border-green-100">
                    33% OFF
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-2xl border border-red-100">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-600 shadow-sm">
                  <Clock size={16} className="animate-pulse" />
                </div>
                <p className="text-red-700 text-xs font-bold leading-tight">
                  Flash Sale! This price is valid for the next 24 hours only.
                </p>
              </div>
            </div>

            {/* CTA BUTTONS */}
            <div className="space-y-4">
              {isEnrolled ? (
                <button
                  onClick={() => navigate("/student/courses")}
                  className="w-full py-5 bg-green-600 text-white rounded-2xl font-bold text-lg hover:bg-green-700 shadow-xl shadow-green-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  Go To My Courses
                  <ChevronRight size={20} />
                </button>
              ) : (
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing Securely...
                    </>
                  ) : (
                    <>
                      Enroll Now & Start Learning
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 bg-slate-50 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all border border-slate-100 flex items-center justify-center gap-2">
                  Share Course
                </button>
                <button className="py-3 bg-slate-50 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all border border-slate-100 flex items-center justify-center gap-2">
                  Add To Wishlist
                </button>
              </div>
            </div>

            {/* TRUST & GUARANTEE */}
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 gap-4">
                {[
                  { icon: Video, text: "Full Lifetime Access", color: "blue" },
                  { icon: Layers, text: "Access on mobile and TV", color: "purple" },
                  { icon: Award, text: "Certificate of completion", color: "green" },
                  { icon: ShieldCheck, text: "30-Day Money-Back Guarantee", color: "red" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center shadow-sm`}>
                      <item.icon size={16} />
                    </div>
                    <span className="text-slate-600 text-sm font-bold">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Safe & Secure Payment</p>
                <div className="flex justify-center items-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-4" alt="PayPal" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-3" alt="Visa" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5" alt="Mastercard" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;