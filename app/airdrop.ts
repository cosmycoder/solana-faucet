"use server";

import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { unstable_noStore as noStore } from 'next/cache';
import { kv } from "@vercel/kv";

export default async function airdrop(formData: FormData) {
    noStore(); // Opt-into dynamic rendering

    const walletAddress = formData.get('walletAddress');
    try { 
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }

      const lastAirdropTimestamp = await Number(kv.get(walletAddress as string));
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (lastAirdropTimestamp && lastAirdropTimestamp > oneHourAgo) {
        const minutesLeft = Math.ceil((lastAirdropTimestamp - oneHourAgo) / 60000);
        return `Try again in ${minutesLeft} minutes`;
      } else {
        kv.set(walletAddress as string, Date.now());
      }

      const secretKey = process.env.SENDER_SECRET_KEY;

      if(!secretKey) return 'Airdrop failed';
      // Convert the secret key from an environment variable to a Uint8Array
      const secretKeyUint8Array = new Uint8Array(
        secretKey.split(',').map((num) => parseInt(num, 10))
      );

      // Create a keypair from the secret key
      const senderKeypair = Keypair.fromSecretKey(secretKeyUint8Array);

      // Connect to the cluster
      const connection = new Connection(clusterApiUrl('testnet'), 'confirmed');

      // Add transfer instruction to transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: new PublicKey(walletAddress as string),
          lamports: LAMPORTS_PER_SOL // Send 1 SOL
        })
      );

      // Sign the transaction with the sender's keypair
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair]
      );

      // The transaction is now sent and confirmed, signature is the transaction id
      return 'Airdrop successful';
    } catch(error) {
      console.log('error airdropping: ', error);
      return 'Airdrop failed';
    }
}