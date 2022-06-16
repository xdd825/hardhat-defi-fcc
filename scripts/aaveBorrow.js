const { getWeth, AMOUNT } = require("../scripts/getWeth")
const { getNamedAccounts, ethers } = require("hardhat")

async function main() {
    await getWeth()

    const { deployer } = await getNamedAccounts()

    //0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    const lendingPool = await getLendingPool(deployer)
    console.log(`LendingPool address ${lendingPool.address}`)

    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing ...")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Deposited!")

    let { totalDebtETH, availableBorrowsETH } = await getBorrowUserData(
        lendingPool,
        deployer
    )
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow =
        availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    console.log(`You can brorow ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(
        amountDaiToBorrow.toString()
    )

    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    console.log("--------------------------------------------")
    await borrowDai(
        daiTokenAddress,
        lendingPool,
        amountDaiToBorrowWei,
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)
    console.log("--------------------------------------------")
    await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer)
    await getBorrowUserData(lendingPool, deployer)
}

async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}

async function borrowDai(
    daiAddress,
    lendingPool,
    amountDaiToBorrowWei,
    account
) {
    const borrowTx = await lendingPool.borrow(
        daiAddress,
        amountDaiToBorrowWei,
        1,
        0,
        account
    )
    await borrowTx.wait(1)
    console.log("You borrow!")
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price}`)
    return price
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You haver total ${totalCollateralETH} worth of ETH deposited`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH`)
    return { totalDebtETH, availableBorrowsETH }
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )
    const lendingPoolAddress =
        await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt(
        "ILendingPool",
        lendingPoolAddress,
        account
    )
    return lendingPool
}

async function approveErc20(
    erc20Address,
    spenderAddress,
    amountToSpend,
    account
) {
    const erc20Token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        account
    )
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approve")
}

main()
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
