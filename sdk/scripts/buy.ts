import * as client from "../client";

async function buy() {
  const lotteryClient = new client.Client();

  await lotteryClient.buy(1);
}

buy();
