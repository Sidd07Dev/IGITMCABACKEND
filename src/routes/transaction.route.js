import { Router } from "express";
import { 
    recordTransaction, 
    getUserTransactions, 
    getAllTransactions, 
    issueRefund 
} from "../controllers/transaction.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Record a new transaction
router.post("/record", verifyJWT, recordTransaction);

// Get user's transaction history
router.get("/user", verifyJWT, getUserTransactions);

// Get all transactions (Admin only)
router.get("/all", verifyJWT, getAllTransactions);

// Issue a refund (Admin only)
router.post("/refund", verifyJWT, issueRefund);

export default router;