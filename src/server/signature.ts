export type SignatureRequest = {
  documentId: string;
  stakeholderId: string;
  signerName: string;
  signerEmail: string;
};

export type SignatureProvider = {
  requestSignature(input: SignatureRequest): Promise<{ method: string; providerRef: string }>;
};

// Internal journal. A qualified e-sign provider can replace this adapter later.
export const internalSignatureProvider: SignatureProvider = {
  async requestSignature() {
    return { method: "INTERNAL", providerRef: "" };
  },
};
