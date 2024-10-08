# Comprehensive Solana Tutorial for Playground (web3.js v2)

This tutorial provides a step-by-step guide to create and interact with tokens on Solana, including checking balance, creating a token with metadata, and interacting with a program. All examples are designed to work directly in the Solana Playground (https://beta.solpg.io/) using web3.js version 2.

## 1. Check Balance and Airdrop

```typescript
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

async function checkBalanceAndAirdrop() {
  const connection = pg.connection;
  const publicKey = new PublicKey(pg.wallet.publicKey);

  console.log("Wallet public key:", publicKey.toBase58());

  let balance = await connection.getBalance(publicKey);
  console.log(`Initial balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < LAMPORTS_PER_SOL) {
    console.log("Requesting airdrop...");
    const signature = await connection.requestAirdrop(
      publicKey,
      LAMPORTS_PER_SOL
    );

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...latestBlockhash
    });

    balance = await connection.getBalance(publicKey);
    console.log(`New balance after airdrop: ${balance / LAMPORTS_PER_SOL} SOL`);
  }

  return balance;
}
```

This function checks the wallet balance and requests an airdrop if the balance is less than 1 SOL.

## 2. Create Token with Metadata

```typescript
import { PublicKey } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { Metaplex } from "@metaplex-foundation/js";
import { 
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";

async function createTokenWithMetadata(
  tokenName: string,
  tokenSymbol: string,
  tokenUri: string
) {
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

  const mintAmount = 1000000000n; // 1 token with 9 decimals
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer,
    mintAmount
  );

  console.log(`Minted ${Number(mintAmount) / 1e9} tokens to ${tokenAccount.address.toBase58()}`);

  // Add metadata
  console.log("Adding metadata...");
  const metaplex = Metaplex.make(connection);

  const metadataPDA = metaplex.nfts().pdas().metadata({ mint });

  const tokenMetadata = {
    name: tokenName,
    symbol: tokenSymbol,
    uri: tokenUri,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null
  };

  const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataPDA,
      mint: mint,
      mintAuthority: payer.publicKey,
      payer: payer.publicKey,
      updateAuthority: payer.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: tokenMetadata,
        isMutable: true,
        collectionDetails: null
      }
    }
  );

  const transaction = await metaplex.transactions().create({
    instructions: [createMetadataInstruction],
    signers: [payer],
  });

  const signature = await metaplex.rpc().sendAndConfirmTransaction(transaction);

  console.log(`Metadata added: ${signature}`);
  console.log(`Metadata address: ${metadataPDA.toBase58()}`);

  return { mint, tokenAccount, metadataPDA };
}
```

This function creates a new token, mints some tokens to an associated token account, and then adds metadata to the token using the Metaplex SDK.

## 3. Interact with a Program (Example)

```typescript
import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

async function interactWithProgram(programId: string, instruction: Buffer) {
  const connection = pg.connection;
  const payer = pg.wallet.keypair;

  const PROGRAM_ID = new PublicKey(programId);

  const ix = {
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      // Add other necessary account keys here
    ],
    data: instruction
  };

  const latestBlockhash = await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [ix]
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([payer]);

  console.log("Sending transaction...");
  const signature = await connection.sendTransaction(transaction);

  console.log("Confirming transaction...");
  await connection.confirmTransaction({
    signature,
    ...latestBlockhash
  });

  console.log("Transaction confirmed:", signature);
  return signature;
}
```

This function demonstrates how to interact with a Solana program using web3.js v2.

## Main Function

Now, let's put it all together in a main function:

```typescript
async function main() {
  try {
    // Step 1: Check balance and airdrop if necessary
    const balance = await checkBalanceAndAirdrop();
    console.log(`Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    // Step 2: Create a token with metadata
    const { mint, tokenAccount, metadataPDA } = await createTokenWithMetadata(
      "My Token",
      "MTKN",
      "https://example.com/my-token-metadata.json"
    );

    console.log(`Token mint: ${mint.toBase58()}`);
    console.log(`Token account: ${tokenAccount.address.toBase58()}`);
    console.log(`Metadata address: ${metadataPDA.toBase58()}`);

    // Step 3: Interact with a program (example)
    const programId = "Your_Program_ID_Here";
    const instruction = Buffer.from([/* Your instruction data */]);
    const signature = await interactWithProgram(programId, instruction);
    console.log(`Program interaction transaction: ${signature}`);

  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
```

This main function ties all the pieces together, demonstrating the full flow from checking balance to creating a token with metadata to interacting with a program.

## Notes

1. Replace `"Your_Program_ID_Here"` with an actual program ID when interacting with a specific program.
2. The metadata URI (`https://example.com/my-token-metadata.json`) should point to a JSON file that follows the Metaplex token standard. Here's an example:

   ```json
   {
     "name": "My Token",
     "symbol": "MTKN",
     "description": "This is my custom token on Solana",
     "image": "https://example.com/my-token-image.png"
   }
   ```

3. Always handle errors appropriately and test thoroughly on devnet before moving to mainnet.
4. The Solana Playground provides `pg.connection` for the connection and `pg.wallet` for wallet operations.
