import { Router } from "express";
import { 
    processPayment, 
    verifyPayment, 
    refundPayment, 
    getUserPayments, 
    
    settleProviderPayment 
} from "../controllers/payment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import express from 'express'


const router = Router();


// Process a payment
router.post("/process", verifyJWT, processPayment);

// Verify payment status (Webhook-based)
router.post("/verify",verifyPayment);

// Refund a payment (Admin only)
router.post("/refund", verifyJWT, refundPayment);

// Get user payment history
router.get("/history", verifyJWT, getUserPayments);

// Generate an invoice for a payment
// router.get("/invoice/:paymentId", verifyJWT, generateInvoice);

// Settle provider payments (Admin only)
router.post("/settle", verifyJWT, settleProviderPayment);

export default router;
