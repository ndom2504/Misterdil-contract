import Constants from 'expo-constants';

const configured = process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra?.apiUrl as string | undefined);

export const API_URL = (configured || 'https://misterdil-contract.vercel.app').replace(/\/$/, '');

export const SYNC_INTERVAL_MS = 3500;
