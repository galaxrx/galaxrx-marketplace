import { createUploadthing } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  listingImages: f({ image: { maxFileSize: "4MB" } })
    .onUploadComplete(() => ({ ok: true })),

  verificationDocs: f({
    image: { maxFileSize: "8MB" },
    pdf: { maxFileSize: "8MB" },
  }).onUploadComplete(() => ({ ok: true })),

  pharmacyLogo: f({ image: { maxFileSize: "2MB" } })
    .onUploadComplete(() => ({ ok: true })),
};

export type OurFileRouter = typeof ourFileRouter;
