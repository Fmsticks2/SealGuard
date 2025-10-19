// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SubscriptionPayments
 * @notice Minimal subscription/payment contract that charges in native FIL (payable) and forwards funds to a treasury address.
 * @dev Payments are sent as native FIL. No ERC20 approvals are needed.
 */
contract SubscriptionPayments is Ownable {
    address public treasury;

    struct Plan {
        uint256 price;           // amount in FIL wei
        uint256 durationSeconds; // subscription duration
        bool exists;
    }

    mapping(uint256 => Plan) public plans; // planId -> Plan
    mapping(address => uint256) public subscriptionExpires; // user -> timestamp

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PlanUpdated(uint256 indexed planId, uint256 price, uint256 durationSeconds);
    event SubscriptionPaid(address indexed payer, uint256 amount, uint256 timestamp);
    event Subscribed(address indexed user, uint256 indexed planId, uint256 price, uint256 expiresAt);

    constructor(address initialTreasury) Ownable(msg.sender) {
        require(initialTreasury != address(0), "Treasury address required");
        treasury = initialTreasury;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Treasury cannot be zero");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setPlan(uint256 planId, uint256 price, uint256 durationSeconds) external onlyOwner {
        require(planId != 0, "planId cannot be zero");
        require(durationSeconds > 0, "duration must be > 0");
        plans[planId] = Plan({ price: price, durationSeconds: durationSeconds, exists: true });
        emit PlanUpdated(planId, price, durationSeconds);
    }

    /**
     * @notice Pay an arbitrary amount in native FIL to the treasury.
     */
    function paySubscription(uint256 amount) external payable returns (bool) {
        require(amount > 0, "amount must be > 0");
        require(msg.value == amount, "incorrect FIL amount sent");
        (bool ok, ) = treasury.call{ value: amount }("");
        require(ok, "FIL transfer failed");
        emit SubscriptionPaid(msg.sender, amount, block.timestamp);
        return true;
    }

    /**
     * @notice Subscribe to a configured plan. Sends exact plan price in native FIL.
     */
    function subscribePlan(uint256 planId) external payable returns (bool) {
        Plan memory p = plans[planId];
        require(p.exists, "plan not found");
        require(p.price > 0, "invalid price");
        require(msg.value == p.price, "incorrect FIL amount sent");

        uint256 start = block.timestamp;
        if (subscriptionExpires[msg.sender] > start) {
            start = subscriptionExpires[msg.sender];
        }
        uint256 newExpiry = start + p.durationSeconds;
        subscriptionExpires[msg.sender] = newExpiry;

        (bool ok, ) = treasury.call{ value: p.price }("");
        require(ok, "FIL transfer failed");

        emit Subscribed(msg.sender, planId, p.price, newExpiry);
        return true;
    }

    function getSubscriptionExpiry(address user) external view returns (uint256) {
        return subscriptionExpires[user];
    }
}