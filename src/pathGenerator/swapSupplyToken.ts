import SupplyBlock from "../block/supply";
import SwapBlock from "../block/swap";
import Account from "../core/account";
import PathGenerator from "../core/pathGenerator";
import randomChoice from "../utils/random/randomChoice";

type PossibleWay = {
  buySwapBlock: SwapBlock;
  supplyBlock: SupplyBlock;
  sellSwapBlock: SwapBlock;
};

class SwapSupplyTokenPathGenerator extends PathGenerator {
  private possibleWays: PossibleWay[];

  constructor(params: {
    swapBlocks: SwapBlock[];
    supplyBlocks: SupplyBlock[];
  }) {
    const { swapBlocks, supplyBlocks } = params;
    super();
    this.possibleWays = this.initializePossibleWays(swapBlocks, supplyBlocks);
  }

  private initializePossibleWays(
    swapBlocks: SwapBlock[],
    supplyBlocks: SupplyBlock[]
  ) {
    const possibleWays = supplyBlocks.reduce((acc, supplyBlock) => {
      if (supplyBlock.token.isNative) return acc;

      const waysToBuyAndSellToken = swapBlocks.reduce((acc, buySwapBlock) => {
        if (!buySwapBlock.fromToken.isNative) return acc;

        if (!buySwapBlock.toToken.isEquals(supplyBlock.token)) return acc;

        const sellPossibleWays = swapBlocks.filter((sellSwapBlock) => {
          return buySwapBlock.toToken.isEquals(sellSwapBlock.fromToken);
        });

        const directions = sellPossibleWays.map((sellSwapBlock) => {
          return { buySwapBlock, supplyBlock, sellSwapBlock };
        });

        return [...acc, ...directions];
      }, [] as PossibleWay[]);

      return [...acc, ...waysToBuyAndSellToken];
    }, [] as PossibleWay[]);

    return possibleWays;
  }

  possibleWaysStrings() {
    return this.possibleWays.map(
      (possibleWay) =>
        `${possibleWay.buySwapBlock} -> ${possibleWay.supplyBlock} -> ${possibleWay.sellSwapBlock}`
    );
  }

  count() {
    return this.possibleWays.length;
  }

  async generateSteps(params: {
    account: Account;
    minWorkAmountPercent: number;
    maxWorkAmountPercent: number;
  }) {
    const { account, minWorkAmountPercent, maxWorkAmountPercent } = params;

    const { buySwapBlock, sellSwapBlock } = randomChoice(this.possibleWays);

    const buySteps = await buySwapBlock.swapPercentSteps({
      account,
      minWorkAmountPercent,
      maxWorkAmountPercent,
    });

    const sellSteps = await sellSwapBlock.swapBalanceSteps({ account });

    return [...buySteps, ...sellSteps];
  }
}

export default SwapSupplyTokenPathGenerator;