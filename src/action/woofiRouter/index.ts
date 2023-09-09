import Big from "big.js";

import {
  ACTION_WOOFI_ROUTER,
  CONTRACT_WOOFI_ROUTER,
  SLIPPAGE_PERCENT,
} from "../../constants";
import Account from "../../core/account";
import Action from "../../core/action";
import Chain from "../../core/chain";
import Token from "../../core/token";
import getContract from "../../utils/web3/getContract";

class WoofiRouter extends Action {
  name = ACTION_WOOFI_ROUTER;

  public getAddressToApprove(chain: Chain) {
    return chain.getContractAddressByName(CONTRACT_WOOFI_ROUTER);
  }

  private async checkIsAllowed(params: {
    account: Account;
    fromToken: Token;
    toToken: Token;
    normalizedAmount: number | string;
  }) {
    const { account, fromToken, toToken, normalizedAmount } = params;

    const { chain } = fromToken;

    const routerContractAddress = chain.getContractAddressByName(
      CONTRACT_WOOFI_ROUTER
    );

    if (!routerContractAddress) {
      throw new Error(`${this.name} action is not available in ${chain.name}`);
    }

    if (!fromToken.chain.isEquals(toToken.chain)) {
      throw new Error(
        `woofi is not available for tokens in different chains: ${fromToken} -> ${toToken}`
      );
    }

    if (!fromToken.isNative) {
      const normalizedAllowance = await fromToken.normalizedAllowance(
        account,
        routerContractAddress
      );

      if (Big(normalizedAllowance).lt(normalizedAmount)) {
        const readableAllowance = await fromToken.toReadableAmount(
          normalizedAllowance
        );
        const readableAmount = await fromToken.toReadableAmount(
          normalizedAmount
        );

        throw new Error(
          `account ${fromToken} allowance is less than amount: ${readableAllowance} < ${readableAmount}`
        );
      }
    }

    const normalizedBalance = await fromToken.normalizedBalanceOf(
      account.address
    );

    if (Big(normalizedBalance).lt(normalizedAmount)) {
      const readableBalance = await fromToken.toReadableAmount(
        normalizedBalance
      );
      const readableAmount = await fromToken.toReadableAmount(normalizedAmount);

      throw new Error(
        `account ${fromToken} balance is less than amount: ${readableBalance} < ${readableAmount}`
      );
    }

    return { routerContractAddress };
  }

  private async getSwapCall(params: {
    account: Account;
    fromToken: Token;
    toToken: Token;
    normalizedAmount: number | string;
    minOutNormalizedAmount: number | string;
    routerContractAddress: string;
  }) {
    const {
      account,
      fromToken,
      toToken,
      normalizedAmount,
      minOutNormalizedAmount,
      routerContractAddress,
    } = params;

    const { chain } = fromToken;
    const { w3 } = chain;

    const routerContract = getContract({
      w3,
      name: CONTRACT_WOOFI_ROUTER,
      address: routerContractAddress,
    });

    return routerContract.methods.swap(
      fromToken.address,
      toToken.address,
      normalizedAmount,
      minOutNormalizedAmount,
      account.address,
      account.address
    );
  }

  async swap(params: {
    account: Account;
    fromToken: Token;
    toToken: Token;
    normalizedAmount: number | string;
  }) {
    const { account, fromToken, toToken, normalizedAmount } = params;

    const { chain } = fromToken;
    const { w3 } = chain;
    const { routerContractAddress } = await this.checkIsAllowed({
      account,
      fromToken,
      toToken,
      normalizedAmount,
    });

    const minOutNormalizedAmount = await toToken.getMinOutNormalizedAmount(
      fromToken,
      normalizedAmount,
      SLIPPAGE_PERCENT
    );

    const swapFunctionCall = await this.getSwapCall({
      account,
      fromToken,
      toToken,
      normalizedAmount,
      minOutNormalizedAmount,
      routerContractAddress,
    });

    const value = fromToken.isNative ? normalizedAmount : 0;

    const estimatedGas = await swapFunctionCall.estimateGas({
      from: account.address,
      value,
    });

    const nonce = await account.nonce(w3);
    const gasPrice = await w3.eth.getGasPrice();

    const tx = {
      data: swapFunctionCall.encodeABI(),
      from: account.address,
      gas: estimatedGas,
      gasPrice,
      nonce,
      to: routerContractAddress,
      value,
    };

    const hash = await account.signAndSendTransaction(chain, tx);

    const inReadableAmount = await fromToken.toReadableAmount(normalizedAmount);
    const outReadableAmount = await toToken.toReadableAmount(
      minOutNormalizedAmount
    );

    return { hash, inReadableAmount, outReadableAmount };
  }
}

export default WoofiRouter;
