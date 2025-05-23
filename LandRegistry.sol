// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract LandRegistry is ERC1155, AccessControl, ReentrancyGuard, IERC1155Receiver {
    using Counters for Counters.Counter;

    // Role definitions
    bytes32 public constant GOVERNMENT_ROLE = keccak256("GOVERNMENT_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant CLIENT_ROLE = keccak256("CLIENT_ROLE");

    // Constants
    uint256 public constant TOKENS_PER_LAND = 100;
    uint256 public constant BASIS_POINTS = 10000; // 100%

    // State variables
    Counters.Counter private _landIds;
    uint256 public verificationFee;
    string private _baseURI;

    // Structs
    struct Land {
        string location;
        uint256 area;
        uint256 pricePerShare;
        bool isVerified;
        address registrar;
        address verifier;
    }

    struct ShareListing {
        address seller;
        uint256 shares;
        uint256 price;
        bool isActive;
    }

    // Mappings
    mapping(uint256 => Land) public lands;
    mapping(uint256 => mapping(address => uint256)) public shareBalances;
    mapping(uint256 => ShareListing) public shareListings;
    mapping(uint256 => address[]) public landOwners;
    mapping(uint256 => uint256[]) public landBalances;

    // Analytics
    uint256 public totalLands;
    uint256 public totalSharesSold;
    uint256 public totalFeesCollected;

    // Historical Data Tracking
    uint256[] public allLandIds;
    
    struct OwnershipRecord {
        address owner;
        uint256 shares;
        uint256 timestamp;
        string action; // "PURCHASE", "TRANSFER", "SALE"
        address from;  // For transfers and sales
        address to;    // For transfers and sales
    }

    struct TransferRecord {
        address from;
        address to;
        uint256 shares;
        uint256 timestamp;
        uint256 price;  // 0 for transfers, actual price for sales
    }

    // Historical data mappings
    mapping(uint256 => OwnershipRecord[]) public ownershipHistory;
    mapping(uint256 => TransferRecord[]) public transferHistory;

    // Events
    event LandRegistered(uint256 indexed landId, address indexed registrar, string location, uint256 area, uint256 pricePerShare);
    event LandVerified(uint256 indexed landId, address indexed verifier);
    event SharesPurchased(uint256 indexed landId, address indexed buyer, uint256 shares, uint256 amount);
    event SharesTransferred(uint256 indexed landId, address indexed from, address indexed to, uint256 shares);
    event ShareListed(uint256 indexed landId, address indexed seller, uint256 shares, uint256 price);
    event ShareSold(uint256 indexed landId, address indexed seller, address indexed buyer, uint256 shares, uint256 price);
    event FeesWithdrawn(address indexed government, uint256 amount);
    event MetricsUpdated(uint256 totalLands, uint256 totalSharesSold, uint256 totalFeesCollected);

    constructor(string memory baseURI) ERC1155(baseURI) {
        _baseURI = baseURI;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        verificationFee = 0.01 ether; // Initial verification fee in MATIC
    }

    // Role Management Functions
    function grantRole(bytes32 role, address account) public override {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not an admin");
        super.grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public override {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not an admin");
        super.revokeRole(role, account);
    }

    // Land Registration
    function registerLand(string memory location, uint256 area, uint256 pricePerShare) 
        external 
        onlyRole(REGISTRAR_ROLE) 
        nonReentrant 
    {
        require(hasRole(REGISTRAR_ROLE, msg.sender), "Caller is not a registrar");
        _landIds.increment();
        uint256 landId = _landIds.current();

        lands[landId] = Land({
            location: location,
            area: area,
            pricePerShare: pricePerShare,
            isVerified: false,
            registrar: msg.sender,
            verifier: address(0)
        });

        // Add to all lands array
        allLandIds.push(landId);

        // Mint initial shares to the contract
        _mint(address(this), landId, TOKENS_PER_LAND, "");

        // Record initial ownership
        ownershipHistory[landId].push(OwnershipRecord({
            owner: address(this),
            shares: TOKENS_PER_LAND,
            timestamp: block.timestamp,
            action: "INITIAL",
            from: address(0),
            to: address(this)
        }));

        totalLands++;
        emit LandRegistered(landId, msg.sender, location, area, pricePerShare);
        emit MetricsUpdated(totalLands, totalSharesSold, totalFeesCollected);
    }

    // Land Verification
    function verifyLand(uint256 landId) 
        external 
        payable 
        onlyRole(VERIFIER_ROLE) 
        nonReentrant 
    {
        require(lands[landId].registrar != address(0), "Land not registered");
        require(!lands[landId].isVerified, "Land already verified");
        require(msg.value >= verificationFee, "Insufficient verification fee");

        lands[landId].isVerified = true;
        lands[landId].verifier = msg.sender;
        totalFeesCollected += msg.value;

        emit LandVerified(landId, msg.sender);
        emit MetricsUpdated(totalLands, totalSharesSold, totalFeesCollected);
    }

    // Share Purchase
    function purchaseShares(uint256 landId, uint256 shares) 
        external 
        payable 
        onlyRole(CLIENT_ROLE) 
        nonReentrant 
    {
        require(lands[landId].registrar != address(0), "Land not registered");
        require(shares > 0 && shares <= TOKENS_PER_LAND, "Invalid share amount");
        require(msg.value >= lands[landId].pricePerShare * shares, "Insufficient payment");

        _safeTransferFrom(address(this), msg.sender, landId, shares, "");
        shareBalances[landId][msg.sender] += shares;
        
        // Update ownership tracking
        landOwners[landId].push(msg.sender);
        landBalances[landId].push(shares);

        // Record ownership history
        ownershipHistory[landId].push(OwnershipRecord({
            owner: msg.sender,
            shares: shares,
            timestamp: block.timestamp,
            action: "PURCHASE",
            from: address(this),
            to: msg.sender
        }));

        // Record transfer
        transferHistory[landId].push(TransferRecord({
            from: address(this),
            to: msg.sender,
            shares: shares,
            timestamp: block.timestamp,
            price: msg.value
        }));

        totalSharesSold += shares;
        emit SharesPurchased(landId, msg.sender, shares, msg.value);
        emit MetricsUpdated(totalLands, totalSharesSold, totalFeesCollected);
    }

    // Share Transfer
    function transferShares(uint256 landId, address to, uint256 shares) 
        external 
        onlyRole(CLIENT_ROLE) 
        nonReentrant 
    {
        require(shareBalances[landId][msg.sender] >= shares, "Insufficient shares");
        require(to != address(0), "Invalid recipient");

        shareBalances[landId][msg.sender] -= shares;
        shareBalances[landId][to] += shares;

        _safeTransferFrom(msg.sender, to, landId, shares, "");

        // Update ownership tracking
        bool found = false;
        for (uint i = 0; i < landOwners[landId].length; i++) {
            if (landOwners[landId][i] == to) {
                landBalances[landId][i] += shares;
                found = true;
                break;
            }
        }
        if (!found) {
            landOwners[landId].push(to);
            landBalances[landId].push(shares);
        }

        // Record ownership history
        ownershipHistory[landId].push(OwnershipRecord({
            owner: to,
            shares: shares,
            timestamp: block.timestamp,
            action: "TRANSFER",
            from: msg.sender,
            to: to
        }));

        // Record transfer
        transferHistory[landId].push(TransferRecord({
            from: msg.sender,
            to: to,
            shares: shares,
            timestamp: block.timestamp,
            price: 0
        }));

        emit SharesTransferred(landId, msg.sender, to, shares);
    }

    // Marketplace Functions
    function listShares(uint256 landId, uint256 shares, uint256 price) 
        external 
        onlyRole(CLIENT_ROLE) 
        nonReentrant 
    {
        require(shareBalances[landId][msg.sender] >= shares, "Insufficient shares");
        require(price > 0, "Invalid price");

        shareListings[landId] = ShareListing({
            seller: msg.sender,
            shares: shares,
            price: price,
            isActive: true
        });

        emit ShareListed(landId, msg.sender, shares, price);
    }

    function buyListedShares(uint256 landId) 
        external 
        payable 
        onlyRole(CLIENT_ROLE) 
        nonReentrant 
    {
        ShareListing storage listing = shareListings[landId];
        require(listing.isActive, "No active listing");
        require(msg.value >= listing.price, "Insufficient payment");

        shareBalances[landId][listing.seller] -= listing.shares;
        shareBalances[landId][msg.sender] += listing.shares;

        _safeTransferFrom(listing.seller, msg.sender, landId, listing.shares, "");
        
        // Update ownership tracking
        bool found = false;
        for (uint i = 0; i < landOwners[landId].length; i++) {
            if (landOwners[landId][i] == msg.sender) {
                landBalances[landId][i] += listing.shares;
                found = true;
                break;
            }
        }
        if (!found) {
            landOwners[landId].push(msg.sender);
            landBalances[landId].push(listing.shares);
        }

        // Record ownership history
        ownershipHistory[landId].push(OwnershipRecord({
            owner: msg.sender,
            shares: listing.shares,
            timestamp: block.timestamp,
            action: "SALE",
            from: listing.seller,
            to: msg.sender
        }));

        // Record transfer
        transferHistory[landId].push(TransferRecord({
            from: listing.seller,
            to: msg.sender,
            shares: listing.shares,
            timestamp: block.timestamp,
            price: msg.value
        }));

        listing.isActive = false;
        payable(listing.seller).transfer(msg.value);

        emit ShareSold(landId, listing.seller, msg.sender, listing.shares, msg.value);
    }

    // Fee Management
    function updateVerificationFee(uint256 newFee) 
        external 
        onlyRole(GOVERNMENT_ROLE) 
    {
        verificationFee = newFee;
    }

    function withdrawFees() 
        external 
        onlyRole(GOVERNMENT_ROLE) 
        nonReentrant 
    {
        uint256 amount = totalFeesCollected;
        totalFeesCollected = 0;
        payable(msg.sender).transfer(amount);
        emit FeesWithdrawn(msg.sender, amount);
    }

    // New Public View Functions for Complete Transparency
    function getAllLands() external view returns (uint256[] memory) {
        return allLandIds;
    }

    function getLandDetails(uint256 landId) 
        external 
        view 
        returns (Land memory) 
    {
        return lands[landId];
    }

    function getCompleteOwnershipHistory(uint256 landId) 
        external 
        view 
        returns (OwnershipRecord[] memory) 
    {
        return ownershipHistory[landId];
    }

    function getTransferHistory(uint256 landId) 
        external 
        view 
        returns (TransferRecord[] memory) 
    {
        return transferHistory[landId];
    }

    function getShareOwnership(uint256 landId) 
        external 
        view 
        returns (address[] memory owners, uint256[] memory balances) 
    {
        return (landOwners[landId], landBalances[landId]);
    }

    function getMetrics() 
        external 
        view 
        returns (uint256, uint256, uint256) 
    {
        return (totalLands, totalSharesSold, totalFeesCollected);
    }

    // Add ERC1155Receiver implementation
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 