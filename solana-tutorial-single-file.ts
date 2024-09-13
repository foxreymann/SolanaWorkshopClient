import { LAMPORTS_PER_SOL, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { Metaplex } from "@metaplex-foundation/js";
import { 
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";

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
    9
  );

  console.log(`Token created: ${mint.toBase58()}`);

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log(`Token account created: ${tokenAccount.address.toBase58()}`);

  const mintAmount = 1000000000n;
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer,
    mintAmount
  );

  console.log(`Minted ${Number(mintAmount) / 1e9} tokens to ${tokenAccount.address.toBase58()}`);

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

async function interactWithProgram(programId: string, instruction: Buffer) {
  const connection = pg.connection;
  const payer = pg.wallet.keypair;

  const PROGRAM_ID = new PublicKey(programId);

  const ix = {
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
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

async function main() {
  try {
    const balance = await checkBalanceAndAirdrop();
    console.log(`Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    const { mint, tokenAccount, metadataPDA } = await createTokenWithMetadata(
      "My Token",
      "MTKN",
      "https://example.com/my-token-metadata.json"
    );

    console.log(`Token mint: ${mint.toBase58()}`);
    console.log(`Token account: ${tokenAccount.address.toBase58()}`);
    console.log(`Metadata address: ${metadataPDA.toBase58()}`);

    const programId = "Your_Program_ID_Here";
    const instruction = Buffer.from([/* Your instruction data */]);
    const signature = await interactWithProgram(programId, instruction);
    console.log(`Program interaction transaction: ${signature}`);

  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
