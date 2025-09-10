import { useWeb3Context } from '../components/Web3/Web3Provider';

export const useWeb3Auth = () => {
  return useWeb3Context();
};

export default useWeb3Auth;