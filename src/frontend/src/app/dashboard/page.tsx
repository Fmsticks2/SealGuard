"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { useQuery, useMutation } from "@tanstack/react-query";
import { readContract, writeContract } from "@wagmi/core";
import { wagmiConfig } from "@/app/providers";
import {
  CONTRACT_ADDRESSES,
  SealGuardRegistryABI,
  FILECOIN_CALIBRATION_CHAIN_ID,
  type DocumentTuple,
  type DocumentProof,
} from "@/lib/contracts";

const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const registryAddress = CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry;

  const { data: myDocs, refetch: refetchDocs, isLoading: docsLoading } = useQuery({
    queryKey: ["user-documents", address],
    enabled: !!address,
    queryFn: async () => {
      if (!address) return [] as bigint[];
      const docs = await readContract(wagmiConfig, {
        abi: SealGuardRegistryABI,
        address: registryAddress,
        functionName: "getUserDocuments",
        args: [address as `0x${string}`],
      });
      return docs as bigint[];
    },
  });

  const { data: documents, isFetching: docsDetailsLoading } = useQuery({
    queryKey: ["documents-details", myDocs],
    enabled: !!myDocs && myDocs.length > 0,
    queryFn: async () => {
      const results: DocumentTuple[] = [];
      for (const id of myDocs!) {
        const doc = (await readContract(wagmiConfig, {
          abi: SealGuardRegistryABI,
          address: registryAddress,
          functionName: "getDocument",
          args: [id],
        })) as unknown as DocumentTuple;
        results.push(doc);
      }
      return results;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: {
      cid: string;
      metadata: string;
      fileSize: number;
      documentType: string;
      fileHashHex: `0x${string}`;
    }) => {
      const txHash = await writeContract(wagmiConfig, {
        abi: SealGuardRegistryABI,
        address: registryAddress,
        functionName: "registerDocument",
        args: [payload.cid, payload.fileHashHex, payload.metadata, BigInt(payload.fileSize), payload.documentType],
      });
      return txHash;
    },
    onSuccess: () => {
      refetchDocs();
    },
  });

  const onRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const cidInput = form.elements.namedItem("cid") as HTMLInputElement;
    const typeInput = form.elements.namedItem("doctype") as HTMLInputElement;
    const metadataInput = form.elements.namedItem("metadata") as HTMLInputElement;

    const file = fileInput.files?.[0];
    if (!file) return alert("Please select a file");

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const fileHashHex = await sha256Hex(bytes);

    registerMutation.mutate({
      cid: cidInput.value,
      metadata: metadataInput.value || "{}",
      fileSize: file.size,
      documentType: typeInput.value || "default",
      fileHashHex,
    });
  };

  const [proofInputs, setProofInputs] = useState<Record<string, { proofData: string; isValid: boolean }>>({});
  const [latestProofs, setLatestProofs] = useState<Record<string, DocumentProof | null>>({});

  const onSubmitProof = async (documentId: bigint) => {
    const key = documentId.toString();
    const inputs = proofInputs[key] || { proofData: "", isValid: true };
    if (!inputs.proofData) {
      alert("Enter proof data first");
      return;
    }
    const encoder = new TextEncoder();
    const bytes = encoder.encode(inputs.proofData);
    const proofHash = await sha256Hex(bytes);
    await writeContract(wagmiConfig, {
      abi: SealGuardRegistryABI,
      address: registryAddress,
      functionName: "submitVerificationProof",
      args: [documentId, proofHash, inputs.proofData, inputs.isValid],
    });
    // refresh document list after proof submission
    await refetchDocs();
  };

  const fetchLatestProof = async (documentId: bigint) => {
    const proof = (await readContract(wagmiConfig, {
      abi: SealGuardRegistryABI,
      address: registryAddress,
      functionName: "getLatestProof",
      args: [documentId],
    })) as unknown as DocumentProof;
    setLatestProofs((prev) => ({ ...prev, [documentId.toString()]: proof }));
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      {!isConnected && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-6">
          <p>Please connect your wallet to view and manage your documents.</p>
        </div>
      )}

      {isConnected && (
        <div className="space-y-8">
          <section className="p-4 bg-white rounded shadow">
            <h2 className="text-lg font-medium mb-3">Register Document</h2>
            <form onSubmit={onRegister} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">File</label>
                <input type="file" name="file" className="border rounded p-2 w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Filecoin CID</label>
                <input type="text" name="cid" placeholder="bafy..." className="border rounded p-2 w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Document Type</label>
                <input type="text" name="doctype" placeholder="legal | financial | identity | default" className="border rounded p-2 w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Metadata (JSON)</label>
                <input type="text" name="metadata" placeholder='{"title":"Acme Contract"}' className="border rounded p-2 w-full" />
              </div>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Registering..." : "Register"}
              </button>
            </form>
          </section>

          <section className="p-4 bg-white rounded shadow">
            <h2 className="text-lg font-medium mb-3">My Documents</h2>
            {docsLoading && <p>Loading documents...</p>}
            {!docsLoading && (!myDocs || myDocs.length === 0) && <p>No documents found.</p>}
            <ul className="divide-y">
              {documents?.map((doc) => (
                <li key={doc.id.toString()} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">CID: {doc.filecoinCID}</p>
                      <p className="text-sm text-gray-600">Type: {doc.documentType} • Size: {doc.fileSize.toString()} bytes</p>
                      <p className="text-sm text-gray-600">Owner: {truncateAddress(doc.owner)}</p>
                    </div>
                    <div className="text-sm">
                      <span className="inline-block px-2 py-1 rounded bg-gray-100">
                        {doc.lifecycle === 0 && "PENDING"}
                        {doc.lifecycle === 1 && "PROCESSING"}
                        {doc.lifecycle === 2 && "VERIFIED"}
                        {doc.lifecycle === 3 && "REJECTED"}
                        {doc.lifecycle === 4 && "EXPIRED"}
                        {doc.lifecycle === 5 && "ARCHIVED"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <div className="text-sm text-gray-600">Document ID: {doc.id.toString()}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Proof data (JSON or string)"
                        className="border rounded p-2 w-full"
                        value={proofInputs[doc.id.toString()]?.proofData || ""}
                        onChange={(e) =>
                          setProofInputs((prev) => ({
                            ...prev,
                            [doc.id.toString()]: { proofData: e.target.value, isValid: prev[doc.id.toString()]?.isValid ?? true },
                          }))
                        }
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={proofInputs[doc.id.toString()]?.isValid ?? true}
                          onChange={(e) =>
                            setProofInputs((prev) => ({
                              ...prev,
                              [doc.id.toString()]: { proofData: prev[doc.id.toString()]?.proofData || "", isValid: e.target.checked },
                            }))
                          }
                        />
                        Valid
                      </label>
                      <button
                        className="px-3 py-2 bg-green-600 text-white rounded"
                        onClick={() => onSubmitProof(doc.id)}
                      >
                        Submit Proof
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-2 bg-gray-200 rounded"
                        onClick={() => fetchLatestProof(doc.id)}
                      >
                        View Latest Proof
                      </button>
                      {latestProofs[doc.id.toString()] && (
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Hash:</span> {latestProofs[doc.id.toString()]!.proofHash}
                          <span className="ml-3 font-medium">Valid:</span> {latestProofs[doc.id.toString()]!.isValid ? "Yes" : "No"}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}


async function sha256Hex(bytes: Uint8Array): Promise<`0x${string}`> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}` as `0x${string}`;
}