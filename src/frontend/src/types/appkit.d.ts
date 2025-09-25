declare namespace JSX {
  interface IntrinsicElements {
    'appkit-wallet-button': {
      size?: 'sm' | 'md';
      label?: string;
      loadingLabel?: string;
      balance?: 'show' | 'hide';
      charsStart?: number;
      charsEnd?: number;
      className?: string;
    };
    'appkit-connect-button': {
      size?: 'sm' | 'md';
      label?: string;
      loadingLabel?: string;
    };
    'appkit-account-button': {
      balance?: 'show' | 'hide';
      charsStart?: number;
      charsEnd?: number;
    };
    'appkit-network-button': Record<string, any>;
  }
}