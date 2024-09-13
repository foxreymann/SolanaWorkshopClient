import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
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

  const mintAmount = 100 * web3.LAMPORTS_PER_SOL;
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

  // Create a new transaction
  const transaction = new web3.Transaction().add(createMetadataInstruction);

  // Sign and send the transaction
  const signature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [payer]
  );

  console.log(`Metadata added: ${signature}`);
  console.log(`Metadata address: ${metadataPDA.toBase58()}`);

  return { mint, tokenAccount, metadataPDA };
}

(async() {
  try {
    const balance = await checkBalanceAndAirdrop();
    console.log(`Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    const { mint, tokenAccount, metadataPDA } = await createTokenWithMetadata(
      "Solana Hub Poland",
      "SHP",
      "https://jade-advisory-tarantula-129.mypinata.cloud/ipfs/QmT4sX9euGLytxe3dNPAoTdrQSRYc7niytTU7t3jcjCqEz"
    );

    console.log(`Token mint: ${mint.toBase58()}`);
    console.log(`Token account: ${tokenAccount.address.toBase58()}`);
    console.log(`Metadata address: ${metadataPDA.toBase58()}`);
  } catch (error) {
    console.error("An error occurred:", error);
  }
})()