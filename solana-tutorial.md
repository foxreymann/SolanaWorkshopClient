# Solana Coding Tutorial for Solana Playground (Revised)

This tutorial provides examples that will work directly in the Solana Playground (https://beta.solpg.io/) without modifications. We'll use the injected connection and wallet provided by the playground environment.

## 1. Check Balance and Airdrop

```typescript
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  // Use the injected connection
  const connection = pg.connection;
  const publicKey = pg.wallet.publicKey;

  console.log("Wallet public key:", publicKey.toBase58());

  let balance = await connection.getBalance(publicKey);
  console.log(`Initial balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < LAMPORTS_PER_SOL) {
    console.log("Requesting airdrop...");
    const airdropSignature = await connection.requestAirdrop(
      publicKey,
      LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(airdropSignature);

    balance = await connection.getBalance(publicKey);
    console.log(`New balance after airdrop: ${balance / LAMPORTS_PER_SOL} SOL`);
  }
}

main().catch(console.error);
```

This script checks the balance of the Playground wallet and requests an airdrop if the balance is less than 1 SOL.

## 2. Create Token

```typescript
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

async function createToken() {
  const connection = pg.connection;
  const payer = pg.wallet.keypair;

  console.log("Creating token...");
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    9 // 9 decimals
  );

  console.log(`Token created: ${mint.toBase58()}`);

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log(`Token account created: ${tokenAccount.address.toBase58()}`);

  const mintAmount = 1000000000; // 1 token with 9 decimals
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer,
    mintAmount
  );

  console.log(`Minted ${mintAmount / 1e9} tokens to ${tokenAccount.address.toBase58()}`);
}

createToken().catch(console.error);
```

This script creates a new token, an associated token account, and mints some tokens to it.

## 3. Interact with a Program (Example)

Here's a simplified example of how you might interact with a program on Solana:

```typescript
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

async function interactWithProgram() {
  const connection = pg.connection;
  const payer = pg.wallet.keypair;

  // This is a hypothetical program ID
  const PROGRAM_ID = new PublicKey("Your_Program_ID_Here");

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      // Add other necessary account keys here
    ],
    programId: PROGRAM_ID,
    data: Buffer.from([]) // Add your instruction data here
  });

  const transaction = new Transaction().add(instruction);

  console.log("Sending transaction...");
  const signature = await connection.sendTransaction(transaction, [payer]);

  console.log("Confirming transaction...");
  await connection.confirmTransaction(signature);

  console.log("Transaction confirmed:", signature);
}

interactWithProgram().catch(console.error);
```

This example shows how to create a transaction to interact with a Solana program. You would need to replace `"Your_Program_ID_Here"` with the actual program ID you're interacting with and add the appropriate instruction data.

## Notes

1. We use `pg.connection` to access the injected Solana connection. This connection is already set up for the appropriate network (devnet by default).

2. The Playground environment provides `pg.wallet` object that you can use to access the wallet. `pg.wallet.publicKey` gives you the public key, and `pg.wallet.keypair` gives you the keypair for signing transactions.

3. These examples use the `@solana/web3.js` and `@solana/spl-token` libraries, which are available in the Solana Playground environment.

4. Remember to handle errors appropriately in a production environment.

5. When interacting with real programs or handling real tokens, always double-check your code and test thoroughly on devnet before moving to mainnet.
