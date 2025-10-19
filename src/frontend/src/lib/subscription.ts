import { ethers } from 'ethers';

const SUBSCRIPTION_ABI = [
  { type: 'function', name: 'paySubscription', stateMutability: 'payable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [{ name: 'ok', type: 'bool' }] },
  { type: 'function', name: 'subscribePlan', stateMutability: 'payable', inputs: [{ name: 'planId', type: 'uint256' }], outputs: [{ name: 'ok', type: 'bool' }] },
  { type: 'function', name: 'plans', stateMutability: 'view', inputs: [{ name: 'planId', type: 'uint256' }], outputs: [{ components: [{ name: 'price', type: 'uint256' }, { name: 'durationSeconds', type: 'uint256' }, { name: 'exists', type: 'bool' }], type: 'tuple' }] },
  { type: 'function', name: 'subscriptionExpires', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: 'expiresAt', type: 'uint256' }] },
  { type: 'function', name: 'treasury', stateMutability: 'view', inputs: [], outputs: [{ name: 'treasury', type: 'address' }] },
];

function getBrowserProvider(): ethers.BrowserProvider {
  const injected = (globalThis as any).ethereum;
  if (!injected) throw new Error('No injected wallet provider found');
  return new ethers.BrowserProvider(injected);
}

export async function paySubscription(amount: string): Promise<string> {
  const subAddr = import.meta.env.VITE_SUBSCRIPTION_CONTRACT_ADDRESS;
  if (!subAddr) throw new Error('Missing VITE_SUBSCRIPTION_CONTRACT_ADDRESS');

  const provider = getBrowserProvider();
  const signer = await provider.getSigner();
  const sub = new ethers.Contract(subAddr, SUBSCRIPTION_ABI, signer);
  const parsed = ethers.parseUnits(amount, 18);
  const tx = await sub.paySubscription(parsed, { value: parsed });
  return tx.hash;
}

export async function subscribePlan(planId: number): Promise<string> {
  const subAddr = import.meta.env.VITE_SUBSCRIPTION_CONTRACT_ADDRESS;
  if (!subAddr) throw new Error('Missing VITE_SUBSCRIPTION_CONTRACT_ADDRESS');

  const provider = getBrowserProvider();
  const signer = await provider.getSigner();
  const sub = new ethers.Contract(subAddr, SUBSCRIPTION_ABI, signer);

  const plan = await sub.plans(planId);
  // ethers v6 returns objects with both named and indexed access
  const price: bigint = (plan?.price ?? plan?.[0]) as bigint;
  if (!price || price <= 0n) throw new Error('Plan not configured or invalid price');

  const tx = await sub.subscribePlan(planId, { value: price });
  return tx.hash;
}

export async function getSubscriptionExpiry(user?: string): Promise<bigint> {
  const subAddr = import.meta.env.VITE_SUBSCRIPTION_CONTRACT_ADDRESS;
  if (!subAddr) throw new Error('Missing VITE_SUBSCRIPTION_CONTRACT_ADDRESS');
  const provider = getBrowserProvider();
  const signer = await provider.getSigner();
  const sub = new ethers.Contract(subAddr, SUBSCRIPTION_ABI, signer);
  const addr = user || await signer.getAddress();
  const expires: bigint = await sub.subscriptionExpires(addr);
  return expires;
}

export async function getPlanPrice(planId: number): Promise<bigint> {
  const subAddr = import.meta.env.VITE_SUBSCRIPTION_CONTRACT_ADDRESS;
  if (!subAddr) throw new Error('Missing VITE_SUBSCRIPTION_CONTRACT_ADDRESS');
  const provider = getBrowserProvider();
  const sub = new ethers.Contract(subAddr, SUBSCRIPTION_ABI, provider);
  const plan = await sub.plans(planId);
  const price: bigint = (plan?.price ?? plan?.[0]) as bigint;
  return price;
}