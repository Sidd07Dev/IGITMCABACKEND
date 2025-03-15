import { Router } from "express";
import { loginUser, logoutUser, registerUser,refreshAccessToken,getCurrentUser, changeCurrentPassword, getAllBatchmates} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();



router.route("/register").post(
    upload.fields([
        {name:"profileImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)


// secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/batchmate").post(verifyJWT,getAllBatchmates)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/user").post(verifyJWT,getCurrentUser)
router.route("/change-password").put(changeCurrentPassword)

export default router