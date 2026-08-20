import {
  createOrderService,
  verifyPaymentService,
  recordPaymentFailureService,
} from "../services/paymentServices.js";


// Create Order
export const createOrder = async (req, res) => {
  try {
    const result = await createOrderService({
      courseId: req.body.courseId,
      userId: req.user.id,
    });
    res.status(200).json(result);
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// Verify Payment
export const verifyPayment = async (req, res) => {
  try {
    const result = await verifyPaymentService({
      ...req.body,
      userId: req.user.id,
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Record Failure
export const recordPaymentFailure = async (req, res) => {
  try {
    const result = await recordPaymentFailureService(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
