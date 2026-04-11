import multer from "multer";
import { Router } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import { requireAuth, requirePermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { attachFilesToRecordController, createStoredFileController, getStoredFileController } from "./files.controller.js";
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from "./files.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(String(file.mimetype || "").toLowerCase())) {
      callback(
        new AppError({
          statusCode: 422,
          code: "VALIDATION_ERROR",
          message: "The uploaded file type is not allowed.",
          details: { field: "file", mimeType: file.mimetype || null },
        }),
      );
      return;
    }

    callback(null, true);
  },
});

function singleFileUploadMiddleware(request, response, next) {
  upload.single("file")(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(
          new AppError({
            statusCode: 422,
            code: "VALIDATION_ERROR",
            message: "The uploaded file exceeds the size limit.",
            details: { field: "file", maxBytes: MAX_UPLOAD_SIZE_BYTES },
          }),
        );
        return;
      }

      next(
        new AppError({
          statusCode: 422,
          code: "VALIDATION_ERROR",
          message: error.message,
          details: { field: "file" },
        }),
      );
      return;
    }

    next(error);
  });
}

export function registerFilesRoutes(router) {
  const filesRouter = Router();

  filesRouter.use(requireAuth);
  filesRouter.post("/", singleFileUploadMiddleware, asyncHandler(createStoredFileController));
  filesRouter.get("/:id", asyncHandler(getStoredFileController));

  router.use("/files", filesRouter);
  router.post("/records/:id/files", requireAuth, requirePermission("records:update"), asyncHandler(attachFilesToRecordController));
}
