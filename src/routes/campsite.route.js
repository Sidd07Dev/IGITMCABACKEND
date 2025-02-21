import { Router } from "express";
import { 
    createCampingSite, 
    getAllCampingSites, 
    getCampingSiteById, 
    updateCampingSite, 
    deleteCampingSite 
} from "../controllers/campsite.controller.js";
import { checkAvailability } from "../controllers/checkAvailability.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Routes
router.route("/").get(getAllCampingSites);
router.route("/:id").get(getCampingSiteById);
router.route("/check-Availability").get(checkAvailability);

// Protected Routes (Admin/Provider Only)
router.route("/").post(
    verifyJWT, 
    upload.fields([
        {name:"images",
            maxCount: 5
        }, {name:"idImage",
            maxCount: 1
        }
    ]), 
    createCampingSite
);

router.route("/:id").put(verifyJWT, updateCampingSite);
router.route("/:id").delete(verifyJWT, deleteCampingSite);

export default router;
