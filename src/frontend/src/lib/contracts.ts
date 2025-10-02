import { Abi } from "viem";

// Filecoin Calibration chain ID
export const FILECOIN_CALIBRATION_CHAIN_ID = 314159;

// Deployed contract addresses on Filecoin Calibration
export const CONTRACT_ADDRESSES = {
  [FILECOIN_CALIBRATION_CHAIN_ID]: {
    SealGuardRegistry: "0xcBB12aBDA134ac0444f2aa41E98EDD57f8D5631F" as `0x${string}`,
    SealGuardAccessControl: "0xF565086417Bf8ba76e4FaFC9F0088818eA027539" as `0x${string}`,
    SealGuardMultiSig: "0xa6e75e7bFc73c44C16aaec914e340843a6A66Df8" as `0x${string}`,
  },
};

// Minimal ABI for SealGuardRegistry used by the frontend
export const SealGuardRegistryABI: Abi = [
  {
    type: "function",
    name: "registerDocument",
    stateMutability: "nonpayable",
    inputs: [
      { name: "filecoinCID", type: "string" },
      { name: "fileHash", type: "bytes32" },
      { name: "metadata", type: "string" },
      { name: "fileSize", type: "uint256" },
      { name: "documentType", type: "string" },
    ],
    outputs: [{ name: "documentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "submitVerificationProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "documentId", type: "uint256" },
      { name: "proofHash", type: "bytes32" },
      { name: "proofData", type: "string" },
      { name: "isValid", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getUserDocuments",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "documentIds", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getDocument",
    stateMutability: "view",
    inputs: [{ name: "documentId", type: "uint256" }],
    outputs: [
      {
        name: "document",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "filecoinCID", type: "string" },
          { name: "fileHash", type: "bytes32" },
          { name: "proofHash", type: "bytes32" },
          { name: "owner", type: "address" },
          { name: "timestamp", type: "uint256" },
          { name: "lastVerified", type: "uint256" },
          { name: "isVerified", type: "bool" },
          { name: "metadata", type: "string" },
          { name: "fileSize", type: "uint256" },
          { name: "documentType", type: "string" },
          { name: "lifecycle", type: "uint8" },
          { name: "expiresAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getLatestProof",
    stateMutability: "view",
    inputs: [{ name: "documentId", type: "uint256" }],
    outputs: [
      {
        name: "proof",
        type: "tuple",
        components: [
          { name: "documentId", type: "uint256" },
          { name: "proofHash", type: "bytes32" },
          { name: "timestamp", type: "uint256" },
          { name: "verifier", type: "address" },
          { name: "isValid", type: "bool" },
          { name: "proofData", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getTotalDocuments",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "total", type: "uint256" }],
  },
  {
    type: "function",
    name: "getDocumentLifecycle",
    stateMutability: "view",
    inputs: [{ name: "documentId", type: "uint256" }],
    outputs: [{ name: "lifecycle", type: "uint8" }],
  },
  {
    type: "function",
    name: "documentExistsByHash",
    stateMutability: "view",
    inputs: [{ name: "fileHash", type: "bytes32" }],
    outputs: [{ name: "exists", type: "bool" }],
  },
  {
    type: "function",
    name: "getDocumentIdByHash",
    stateMutability: "view",
    inputs: [{ name: "fileHash", type: "bytes32" }],
    outputs: [{ name: "documentId", type: "uint256" }],
  },
];

export type DocumentTuple = {
  id: bigint;
  filecoinCID: string;
  fileHash: `0x${string}`;
  proofHash: `0x${string}`;
  owner: `0x${string}`;
  timestamp: bigint;
  lastVerified: bigint;
  isVerified: boolean;
  metadata: string;
  fileSize: bigint;
  documentType: string;
  lifecycle: number; // enum as uint8
  expiresAt: bigint;
};

export type DocumentProof = {
  documentId: bigint;
  proofHash: `0x${string}`;
  timestamp: bigint;
  verifier: `0x${string}`;
  isValid: boolean;
  proofData: string;
};