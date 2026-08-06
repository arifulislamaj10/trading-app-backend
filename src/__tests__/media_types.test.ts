import {
  resolveContentType,
  resolveUploadFolder,
} from "../app/utils/media_types";

describe("Media Types Utils", () => {
  const mockFile = (originalname: string, mimetype: string): any => ({
    originalname,
    mimetype,
    buffer: Buffer.from("test"),
  });

  describe("resolveContentType", () => {
    it("should return mimetype if provided and not octet-stream", () => {
      const file = mockFile("video.mp4", "video/mp4");
      expect(resolveContentType(file)).toBe("video/mp4");
    });

    it("should resolve from extension if mimetype is octet-stream", () => {
      const file = mockFile("video.mp4", "application/octet-stream");
      expect(resolveContentType(file)).toBe("video/mp4");
    });

    it("should resolve new video extensions correctly", () => {
      expect(resolveContentType(mockFile("video.3gp", ""))).toBe("video/3gpp");
      expect(resolveContentType(mockFile("video.m4v", ""))).toBe("video/mp4");
      expect(resolveContentType(mockFile("video.mpeg", ""))).toBe("video/mpeg");
    });

    it("should fallback to octet-stream for unknown extensions", () => {
      expect(resolveContentType(mockFile("file.unknown", ""))).toBe(
        "application/octet-stream",
      );
    });
  });

  describe("resolveUploadFolder", () => {
    it('should return "videos" for video files', () => {
      expect(resolveUploadFolder(mockFile("video.mp4", "video/mp4"))).toBe(
        "videos",
      );
      expect(
        resolveUploadFolder(mockFile("video.3gp", "application/octet-stream")),
      ).toBe("videos");
      expect(resolveUploadFolder(mockFile("video.mkv", ""))).toBe("videos");
    });

    it('should return "images" for image files', () => {
      expect(resolveUploadFolder(mockFile("image.jpg", "image/jpeg"))).toBe(
        "images",
      );
      expect(resolveUploadFolder(mockFile("image.webp", ""))).toBe("images");
    });

    it('should return "documents" for other files', () => {
      expect(resolveUploadFolder(mockFile("doc.pdf", "application/pdf"))).toBe(
        "documents",
      );
      expect(resolveUploadFolder(mockFile("data.csv", "text/csv"))).toBe(
        "documents",
      );
    });
  });
});
