import * as anchor from "@project-serum/anchor";
import * as spl from "@solana/spl-token";
import * as tokenSwap from "@solana/spl-token-swap";
import { Program } from "@project-serum/anchor";
import { NoLossLottery } from "../target/types/no_loss_lottery";

interface Accounts {
  depositMint: anchor.web3.PublicKey;
  depositVault: anchor.web3.PublicKey;
  yieldMint: anchor.web3.PublicKey;
  yieldVault: anchor.web3.PublicKey;
  tickets: anchor.web3.PublicKey;
  vaultManager: anchor.web3.PublicKey;
  userDepositAta: anchor.web3.PublicKey;
  swapDepositVault: anchor.web3.PublicKey;
  swapYieldVault: anchor.web3.PublicKey;
  poolMint: anchor.web3.PublicKey;
  amm: anchor.web3.PublicKey;
  ammAuthority: anchor.web3.PublicKey;
  poolFee: anchor.web3.PublicKey;
}

function initAccounts(
  depositMint: anchor.web3.PublicKey,
  depositVault: anchor.web3.PublicKey,
  yieldMint: anchor.web3.PublicKey,
  yieldVault: anchor.web3.PublicKey,
  tickets: anchor.web3.PublicKey,
  vaultManager: anchor.web3.PublicKey,
  userDepositAta: anchor.web3.PublicKey,
  swapDepositVault: anchor.web3.PublicKey,
  swapYieldVault: anchor.web3.PublicKey,
  poolMint: anchor.web3.PublicKey,
  amm: anchor.web3.PublicKey,
  ammAuthority: anchor.web3.PublicKey,
  poolFee: anchor.web3.PublicKey
): Accounts {
  const accounts = {
    depositMint: depositMint,
    depositVault: depositVault,
    yieldMint: yieldMint,
    yieldVault: yieldVault,
    tickets: tickets,
    vaultManager: vaultManager,
    userDepositAta: userDepositAta,
    swapDepositVault: swapDepositVault,
    swapYieldVault: swapYieldVault,
    poolMint: poolMint,
    amm: amm,
    ammAuthority: ammAuthority,
    poolFee: poolFee,
  };

  console.log("\ndepositMint: %s", depositMint);
  console.log("depositVault: %s", depositVault);
  console.log("yieldMint: %s", yieldMint);
  console.log("yieldVault: %s", yieldVault);
  console.log("tickets: %s", tickets);
  console.log("vaultManager: %s", vaultManager);
  console.log("userDepositAta: %s", userDepositAta);
  console.log("swapDepositVault: %s", swapDepositVault);
  console.log("swapYieldVault: %s", swapYieldVault);
  console.log("poolMint: %s", poolMint);
  console.log("amm: %s", amm);
  console.log("ammAuthority: %s\n", ammAuthority);

  return accounts
}

export class Client {
  private program: Program<NoLossLottery>;
  private accounts: Accounts;

  constructor(accounts?: Accounts) {
    this.program = anchor.workspace.NoLossLottery as Program<NoLossLottery>;
    this.accounts = accounts;
  }

  // initialize lottery
  public async initialize(
    drawDurationSeconds: number,
    ticketPrice: number
  ): Promise<string> {
    // if any of the keys are empty, init everything
    if (this.accounts === undefined) {
      const mintAuthority = await this.newAccountWithLamports();

      // create deposit mint for testing
      const depositMint = await spl.createMint(
        this.program.provider.connection,
        mintAuthority,
        mintAuthority.publicKey,
        null,
        9
      );

      // create yield mint for testing
      const yieldMint = await spl.createMint(
        this.program.provider.connection,
        mintAuthority,
        mintAuthority.publicKey,
        null,
        9
      );

      // get PDAs

      const [depositVault, _depositVaultBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [depositMint.toBuffer()],
          this.program.programId
        );

      const [yieldVault, _yieldVaultBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [yieldMint.toBuffer()],
          this.program.programId
        );

      const [vaultMgr, _vaultMgrBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            depositMint.toBuffer(),
            yieldMint.toBuffer(),
            depositVault.toBuffer(),
            yieldVault.toBuffer(),
          ],
          this.program.programId
        );

      const [tickets, _ticketsBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            depositMint.toBuffer(),
            yieldMint.toBuffer(),
            depositVault.toBuffer(),
            yieldVault.toBuffer(),
            vaultMgr.toBuffer(),
          ],
          this.program.programId
        );

      // get user ata
      const userDepositAta = await spl.getOrCreateAssociatedTokenAccount(
        this.program.provider.connection,
        mintAuthority,
        depositMint,
        this.program.provider.wallet.publicKey
      );

      // mint tokens to user_ata
      await spl.mintTo(
        this.program.provider.connection,
        mintAuthority,
        depositMint,
        userDepositAta.address,
        mintAuthority.publicKey,
        100
      );

      // init swap pool
      const TRADING_FEE_NUMERATOR = 25;
      const TRADING_FEE_DENOMINATOR = 10000;
      const OWNER_TRADING_FEE_NUMERATOR = 5;
      const OWNER_TRADING_FEE_DENOMINATOR = 10000;
      const OWNER_WITHDRAW_FEE_NUMERATOR = 0;
      const OWNER_WITHDRAW_FEE_DENOMINATOR = 0;
      const HOST_FEE_NUMERATOR = 20;
      const HOST_FEE_DENOMINATOR = 100;

      const tokenSwapAccount = new anchor.web3.Account();

      const [tokenSwapAccountAuthority, tokenSwapAccountAuthorityBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [tokenSwapAccount.publicKey.toBuffer()],
          tokenSwap.TOKEN_SWAP_PROGRAM_ID
        );

      // create pool mint

      const tokenPoolMint = await spl.createMint(
        this.program.provider.connection,
        mintAuthority,
        tokenSwapAccountAuthority,
        null,
        2
      );

      const feeAccount = await spl.getOrCreateAssociatedTokenAccount(
        this.program.provider.connection,
        mintAuthority,
        tokenPoolMint,
        new anchor.web3.PublicKey(
          "HfoTxFR1Tm6kGmWgYWD6J7YHVy1UwqSULUGVLXkJqaKN"
        ),
        true
      );

      // create swap token accounts
      const swapPoolMintTokenAccount =
        await spl.getOrCreateAssociatedTokenAccount(
          this.program.provider.connection,
          mintAuthority,
          tokenPoolMint,
          mintAuthority.publicKey,
          false
        );
      const swapDepositVault = await spl.getOrCreateAssociatedTokenAccount(
        this.program.provider.connection,
        mintAuthority,
        depositMint,
        tokenSwapAccountAuthority,
        true
      );
      const swapYieldVault = await spl.getOrCreateAssociatedTokenAccount(
        this.program.provider.connection,
        mintAuthority,
        yieldMint,
        tokenSwapAccountAuthority,
        true
      );

      // mint initial tokens to swap token accounts
      await spl.mintTo(
        this.program.provider.connection,
        mintAuthority,
        depositMint,
        swapDepositVault.address,
        mintAuthority,
        100000
      );
      await spl.mintTo(
        this.program.provider.connection,
        mintAuthority,
        yieldMint,
        swapYieldVault.address,
        mintAuthority,
        100000
      );

      await tokenSwap.TokenSwap.createTokenSwap(
        this.program.provider.connection,
        mintAuthority,
        tokenSwapAccount,
        tokenSwapAccountAuthority,
        swapDepositVault.address,
        swapYieldVault.address,
        tokenPoolMint,
        depositMint,
        yieldMint,
        feeAccount.address,
        swapPoolMintTokenAccount.address,
        tokenSwap.TOKEN_SWAP_PROGRAM_ID,
        spl.TOKEN_PROGRAM_ID,
        tokenSwapAccountAuthorityBump,
        TRADING_FEE_NUMERATOR,
        TRADING_FEE_DENOMINATOR,
        OWNER_TRADING_FEE_NUMERATOR,
        OWNER_TRADING_FEE_DENOMINATOR,
        OWNER_WITHDRAW_FEE_NUMERATOR,
        OWNER_WITHDRAW_FEE_DENOMINATOR,
        HOST_FEE_NUMERATOR,
        HOST_FEE_DENOMINATOR,
        tokenSwap.CurveType.ConstantProduct
      );

      // set accounts for future use
      this.accounts = initAccounts(
        depositMint,
        depositVault,
        yieldMint,
        yieldVault,
        tickets,
        vaultMgr,
        userDepositAta.address,
        swapDepositVault.address,
        swapYieldVault.address,
        tokenPoolMint,
        tokenSwapAccount.publicKey,
        tokenSwapAccountAuthority,
        feeAccount.address
      );
    }

    // init lottery
    return this.program.rpc.initialize(
      new anchor.BN(drawDurationSeconds),
      new anchor.BN(ticketPrice),
      {
        accounts: {
          depositMint: this.accounts.depositMint,
          depositVault: this.accounts.depositVault,
          yieldMint: this.accounts.yieldMint,
          yieldVault: this.accounts.yieldVault,
          vaultManager: this.accounts.vaultManager,
          tickets: this.accounts.tickets,
          user: this.program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
      }
    );
  }

  public async draw(): Promise<string> {
    return this.program.rpc.draw({
      accounts: {
        depositMint: this.accounts.depositMint,
        depositVault: this.accounts.depositVault,
        yieldMint: this.accounts.yieldMint,
        yieldVault: this.accounts.yieldVault,
        tickets: this.accounts.tickets,
        vaultManager: this.accounts.vaultManager,
        user: this.program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    });
  }

  public async stake() {
    return this.program.rpc.stake({
      accounts: {
        depositMint: this.accounts.depositMint,
        depositVault: this.accounts.depositVault,
        yieldMint: this.accounts.yieldMint,
        yieldVault: this.accounts.yieldVault,
        vaultManager: this.accounts.vaultManager,
        swapYieldVault: this.accounts.swapYieldVault,
        swapDepositVault: this.accounts.swapDepositVault,
        poolMint: this.accounts.poolMint,
        amm: this.accounts.amm,
        ammAuthority: this.accounts.ammAuthority,
        poolFee: this.accounts.poolFee,
        user: this.program.provider.wallet.publicKey,
        tokenSwapProgram: tokenSwap.TOKEN_SWAP_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    });
  }

  public async dispense() {
    // fetch winning numbers
    const vaultMgrAccount = await this.program.account.vaultManager.fetch(
      this.accounts.vaultManager
    );

    // create winning ticket PDA
    const [ticket, ticketBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Uint8Array.from(vaultMgrAccount.winningNumbers),
        this.accounts.vaultManager.toBuffer(),
      ],
      this.program.programId
    );

    // dispense prize to winner
    return this.program.rpc.dispense(vaultMgrAccount.winningNumbers, {
      accounts: {
        depositMint: this.accounts.depositMint,
        depositVault: this.accounts.depositVault,
        yieldMint: this.accounts.yieldMint,
        yieldVault: this.accounts.yieldVault,
        tickets: this.accounts.tickets,
        vaultManager: this.accounts.vaultManager,
        ticket: ticket,
        swapYieldVault: this.accounts.swapYieldVault,
        swapDepositVault: this.accounts.swapDepositVault,
        poolMint: this.accounts.poolMint,
        amm: this.accounts.amm,
        ammAuthority: this.accounts.ammAuthority,
        poolFee: this.accounts.poolFee,
        user: this.program.provider.wallet.publicKey,
        userDepositAta: this.accounts.userDepositAta,
        tokenSwapProgram: tokenSwap.TOKEN_SWAP_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      },
    });
  }

  private async newAccountWithLamports(
    lamports: number = 100_000_000
  ): Promise<anchor.web3.Account> {
    // generate keypair
    const account = new anchor.web3.Account();

    // airdrop lamports
    let txSig = await this.program.provider.connection.requestAirdrop(
      account.publicKey,
      lamports
    );
    await this.program.provider.connection.confirmTransaction(txSig);

    return account;
  }
}
