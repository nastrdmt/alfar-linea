import SupplyBlock from "../block/supply";
import Account from "../core/account";
import PathGenerator from "../core/pathGenerator";
import randomChoice from "../utils/random/randomChoice";

type PossibleWay = SupplyBlock;

class SupplyEthPathGenerator extends PathGenerator {
  private possibleWays: PossibleWay[];
  description = "Supply -> redeem eth";

  constructor(params: { supplyBlocks: SupplyBlock[] }) {
    const { supplyBlocks } = params;
    super();
    this.possibleWays = this.initializePossibleWays(supplyBlocks);
  }

  initializePossibleWays(supplyBlocks: SupplyBlock[]) {
    return supplyBlocks.filter((supplyBlock) => supplyBlock.token.isNative);
  }

  possibleWaysStrings() {
    return this.possibleWays.map((possibleWay) => `${possibleWay}`).sort();
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

    const supplyBlock = randomChoice(this.possibleWays);

    const supplySteps = await supplyBlock.supplyPercentSteps({
      account,
      minWorkAmountPercent,
      maxWorkAmountPercent,
    });

    const redeemSteps = supplyBlock.redeemAllSteps({ account });

    return [...supplySteps, ...redeemSteps];
  }
}

export default SupplyEthPathGenerator;
