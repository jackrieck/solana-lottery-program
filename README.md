# no-loss-lottery

Solana Riptide Hackathon

## test

```bash
anchor test
```

## prompt

No-loss lottery: Build a platform for users to deposit a variety of tokens into a pool and then connect the pool to a Solana lending protocol which aggregates funds and rewards the interest to a winner over a period of time.

## lottery flow

- users choose 6 numbers, creates PDA numbers and vault pubkey as seed
- users calls `buy` adds in their PDA, receives ticket
- cranks call `draw`, draw selects 6 random numbers and sets these in vault manager config. `draw` locks `buy` until find is called
- cranks call `dispense`, pass in PDA derived from winning numbers generated by `draw`
- if winning numbers PDA passed to `dispense` is an already initialized account, send the prize to the owner
- if winning numbers PDA passed to `dispense` is not initialized, unlock buy, zero out winning numbers, no error

## invest flow

- crank calls `stake` periodically to exchange tokens `deposit` tokens in `deposit_vault` for `yield` tokens in `yield_vault` via an AMM
- user calls `redeem`, first look in `deposit_vault` to see if we have enough liquidity.
- if enough liquidity, transfer `deposit` tokens back to user`
- if not call `swap_tokens` to get enough liquidity and transfer `deposit` tokens back to user.
- if `dispense` finds winner, calculate prize amount and call `swap_tokens` to swap all `yield` tokens for `deposit` tokens, calculate prize and send to winner.

## sdk usage

```bash
# initialize writes pubkey's to `./clientaccounts.env
# required for further commands
ANCHOR_WALLET="/Users/jack/.config/solana/id.json" ANCHOR_PROVIDER_URL="http://localhost:8899" ts-node ./sdk/scripts/initialize.ts

# buy winning ticket
ANCHOR_WALLET="/Users/jack/.config/solana/id.json" ANCHOR_PROVIDER_URL="http://localhost:8899" ts-node ./sdk/scripts/buy.ts

# draw winning ticket numbers
ANCHOR_WALLET="/Users/jack/.config/solana/id.json" ANCHOR_PROVIDER_URL="http://localhost:8899" ts-node ./sdk/scripts/draw.ts

# dispense prize to winner
ANCHOR_WALLET="/Users/jack/.config/solana/id.json" ANCHOR_PROVIDER_URL="http://localhost:8899" ts-node ./sdk/scripts/dispense.ts
```

### TODO

- VRF to pick a random winning ticket
- soteria
- github actions automated deploy pipeline
- rename Vault Manager to manager
- try to reduce PDA seed sprawl
- `checked` functions research
- take % when prize is dispensed
- change number array size
- create admin account which deploys/collects fees/calls initialize
- break up into multiple files
- write init tests
- add ticket purchase lock in for > 1 epoch
