// src/lib/managers/HoldingsManager.svelte.ts
import { portfolioManager } from './PortfolioManager.svelte';
import { priceManager } from './PriceManager.svelte';
import { hdoManager } from './HdoManager.svelte';
import { formatDate } from '$lib/utils/formatting';
import { cashManager } from './CashManager.svelte';

class HoldingsManager {
	// State
	holdings = $state<any[]>([]);
	isLoading = $state(false);
	error = $state<string | null>(null);
	dividendIncomes = $state(new Map<string, number>());
	isInitialized = $state(false);
	#lastLoadTime = 0;
	#lastLoadedPortfolio: string | null = null;
	#cacheValidDuration = 40000;
	#isBackgroundRefreshing = false;
	#refreshingForPortfolio = $state<string | null>(null);

	// used for TrackerTable toggle (toggle method at bottom here)
	showHdoOnly = $state(false);

	addPosition = async (security, quantity, price, purchaseDate, isReinvestment = false) => {
		this.isLoading = true;
		this.error = null;

		try {
			const portfolioId = portfolioManager.activePortfolioId;
			if (!portfolioId) {
				throw new Error('no active portfolio selected');
			}

			// Check if position already exists
			const existingIndex = this.holdings.findIndex(
				(h) => h.ticker.toUpperCase() === security.symbol.toUpperCase()
			);

			let optimisticUpdate;
			let originalHoldings = [...this.holdings]; // Backup for rollback

			if (existingIndex !== -1) {
				// 1A. UPDATE EXISTING POSITION
				const existingHolding = this.holdings[existingIndex];
				const currentQuantity = parseFloat(existingHolding.quantity);
				const currentCost = parseFloat(existingHolding.averageCost);
				const addQuantity = parseFloat(quantity);
				const addPrice = parseFloat(price);

				const newQuantity = currentQuantity + addQuantity;
				const newAverageCost =
					(currentQuantity * currentCost + addQuantity * addPrice) / newQuantity;

				// Calculate new annual dividend amount
				const dividendYield = security.dividendYield || existingHolding.dividendYield || 0;
				const newPositionValue = newQuantity * (security.currentPrice || addPrice);
				const newAnnualAmount = newPositionValue * (dividendYield / 100);

				const updatedHolding = {
					...existingHolding,
					quantity: newQuantity.toString(),
					averageCost: newAverageCost.toString(),
					annualAmount: newAnnualAmount.toString(),
					updatedAt: new Date()
				};

				this.holdings = this.holdings.map((holding, index) =>
					index === existingIndex ? updatedHolding : holding
				);

				optimisticUpdate = { type: 'update', index: existingIndex, original: existingHolding };
			} else {
				// 1B. ADD NEW POSITION
				const optimisticHolding = this.createOptimisticHolding(
					security,
					quantity,
					price,
					purchaseDate
				);
				this.holdings = [...this.holdings, optimisticHolding];
				optimisticUpdate = { type: 'add', holding: optimisticHolding };
			}

			this.calculateDividendSummary(); // Charts update immediately!

			// 2. SERVER SYNC
			const response = await fetch('/api/portfolio/holdings/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					portfolioId,
					security,
					quantity,
					price,
					purchaseDate,
					isReinvestment
				})
			});

			if (!response.ok) {
				// Rollback optimistic update on failure
				this.holdings = originalHoldings;
				this.calculateDividendSummary();
				const errorData = await response.json();
				throw new Error(errorData.message || 'failed to add position');
			}

			// 3. SUCCESS PATH: Refresh holdings (price will be fetched in background)
			const result = await response.json();

			await priceManager.onNewPosition(security.symbol);

			this.#lastLoadTime = 0;
			console.log('✅ Position added, cache invalidated - layout effect will reload');

			return result;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'unknown error';
			throw error;
		} finally {
			this.isLoading = false;
		}
	};

	loadHoldings = async (portfolioId: string) => {
		const callStack = new Error().stack?.split('\n').slice(1, 4).join(' → ');
		console.log('🔍 loadHoldings CALLED:', {
			portfolioId,
			timestamp: new Date().toLocaleTimeString(),
			callStack: callStack,
			currentHoldingsCount: this.holdings.length,
			isLoading: this.isLoading
		});
		// Require portfolioId parameter - no fallbacks, no reactive reads
		if (!portfolioId) {
			throw new Error('Portfolio ID is required');
		}

		if (this.#isBackgroundRefreshing && this.#refreshingForPortfolio === portfolioId) {
			console.log('⏸️ Skipping load during background refresh for same portfolio');
			return this.holdings;
		}

		const now = Date.now();

		const lastLoadedPortfolio = this.#lastLoadedPortfolio;
		const lastLoadTime = this.#lastLoadTime;
		const isSamePortfolio = lastLoadedPortfolio === portfolioId;
		const isCacheValid = now - lastLoadTime < this.#cacheValidDuration;

		if (isSamePortfolio && isCacheValid) {
			console.log('🚀 Using cached holdings data (avoiding database hit)');
			return this.holdings;
		}

		if (!isSamePortfolio && this.holdings.length > 0) {
			console.log('🗑️ Clearing stale holdings data for portfolio switch');
			this.holdings = [];
			this.calculateDividendSummary(); // Reset calculations too
		}

		console.log('📊 Loading fresh holdings from database');

		this.isLoading = true;
		this.isInitialized = true;
		this.error = null;

		try {
			const response = await fetch(`/api/portfolio/${portfolioId}/holdings`);

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();

			if (data.success) {
				const hdoCount = (data.holdings || []).filter((h) => h.source === 'hdo').length;
				console.log('🔍 loadHoldings RESULT:', {
					portfolioId,
					totalHoldings: data.holdings?.length || 0,
					hdoHoldings: hdoCount,
					timestamp: new Date().toLocaleTimeString()
				});
				this.holdings = data.holdings || [];
				this.#lastLoadedPortfolio = portfolioId;
				this.#lastLoadTime = now;
			} else {
				throw new Error(data.message || 'Server returned error');
			}

			return this.holdings;
		} catch (error) {
			console.error('Error loading holdings:', error);
			this.error = error instanceof Error ? error.message : 'Unknown error';
			if (this.holdings.length === 0) {
				this.holdings = []; // Only clear if we had no data
			}
			return [];
		} finally {
			this.isLoading = false;
			this.#lastLoadedPortfolio = portfolioId;
		}
	};

	calculateDividendSummary = () => {
		let totalValue = 0;
		let annualIncome = 0;

		this.holdings.forEach((holding) => {
			const quantity = parseFloat(holding.quantity);
			const price = holding.currentPrice || 0;
			const dividendYield = holding.dividendYield || 0;

			const value = quantity * price;
			totalValue += value;

			// Calculate annual dividend income (yield is stored as percentage)
			const dividendIncome = value * (dividendYield / 100);
			annualIncome += dividendIncome;
		});

		// You can add a portfolioSummary property if needed
		this.portfolioSummary = {
			totalValue,
			annualIncome,
			monthlyIncome: annualIncome / 12,
			yield: totalValue > 0 ? (annualIncome / totalValue) * 100 : 0
		};
	};

	// Helper function to calculate dividend amount from price and yield
	calculateDividendAmount = (price, yieldPercentage) => {
		return (price * yieldPercentage) / 100;
	};

	// Helper method to create optimistic holding for instant UI updates
	createOptimisticHolding = (security, quantity, price, purchaseDate = new Date()) => {
		const dividendYield = security.dividendYield || 0;
		const positionValue = parseFloat(quantity) * parseFloat(price);
		const annualDividendAmount = positionValue * (dividendYield / 100);
		return {
			id: `temp-${Date.now()}`, // Temporary ID until server assigns real one
			ticker: security.symbol,
			name: security.name,
			quantity: quantity.toString(),
			averageCost: price.toString(),
			source: security.source || 'fmp',
			livePrice: security.currentPrice || price, // Use current price or purchase price
			createdAt: purchaseDate,
			updatedAt: new Date(),
			// Add other fields your charts expect
			dividendYield: dividendYield,
			annualAmount: annualDividendAmount.toString(),
			dividendFrequency: security.dividendFrequency || 'Unknown',
			category: security.category || 'Market',
			hdoSector: security.hdoSector || null
		};
	};

	searchUserHoldings = (query: string) => {
		if (!query || query.length < 1) return [];

		console.log('Searching holdings for portfolio:', portfolioManager.activePortfolioId);
		console.log(
			'Holdings available:',
			this.holdings.map((h) => ({ ticker: h.ticker, quantity: h.quantity }))
		);

		const normalizedQuery = query.toLowerCase();

		return this.holdings
			.filter((holding) => {
				const ticker = holding.ticker.toLowerCase();
				const name = holding.name.toLowerCase();

				return ticker.includes(normalizedQuery) || name.includes(normalizedQuery);
			})
			.map((holding) => ({
				id: holding.ticker,
				symbol: holding.ticker,
				name: holding.name,
				currentPrice: holding.currentPrice || 0,
				availableShares: parseFloat(holding.quantity),
				source: holding.source || 'portfolio',
				category: 'Current Holding'
			}))
			.sort((a, b) => {
				const aTickerMatch = a.symbol.toLowerCase().startsWith(normalizedQuery);
				const bTickerMatch = b.symbol.toLowerCase().startsWith(normalizedQuery);

				if (aTickerMatch && !bTickerMatch) return -1;
				if (!aTickerMatch && bTickerMatch) return 1;

				return a.symbol.localeCompare(b.symbol);
			});
	};

	getAvailableShares = (ticker: string) => {
		const holding = this.holdings.find((h) => h.ticker.toUpperCase() === ticker.toUpperCase());
		return holding ? parseFloat(holding.quantity) : 0;
	};

	// Add this complete sellPosition method to HoldingsManager
	sellPosition = async (security, quantity, price, saleDate) => {
		this.isLoading = true;
		this.error = null;

		try {
			const portfolioId = portfolioManager.activePortfolioId;
			if (!portfolioId) {
				throw new Error('No active portfolio selected');
			}

			// Find the holding to update
			const holdingIndex = this.holdings.findIndex(
				(h) => h.ticker.toUpperCase() === security.symbol.toUpperCase()
			);

			if (holdingIndex === -1) {
				throw new Error(`You don't own any shares of ${security.symbol}`);
			}

			const currentHolding = this.holdings[holdingIndex];
			const currentQuantity = parseFloat(currentHolding.quantity);
			const sellQuantity = parseFloat(quantity);

			if (sellQuantity > currentQuantity) {
				throw new Error(
					`Cannot sell ${sellQuantity} shares. You only own ${currentQuantity} shares of ${security.symbol}`
				);
			}

			// 1. INSTANT LOCAL UPDATE (like Cash does)
			let originalHoldings = [...this.holdings]; // Backup for rollback

			if (sellQuantity >= currentQuantity) {
				// Full sale - remove holding entirely
				this.holdings = this.holdings.filter((_, index) => index !== holdingIndex);
			} else {
				// Partial sale - reduce quantity
				const newQuantity = currentQuantity - sellQuantity;
				const updatedHolding = {
					...currentHolding,
					quantity: newQuantity.toString(),
					updatedAt: new Date()
				};

				this.holdings = this.holdings.map((holding, index) =>
					index === holdingIndex ? updatedHolding : holding
				);
			}

			this.calculateDividendSummary(); // Charts update immediately!

			// 2. SERVER SYNC (background)
			const response = await fetch('/api/portfolio/holdings/sell', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					portfolioId,
					security,
					quantity,
					price,
					saleDate
				})
			});

			if (!response.ok) {
				// Rollback optimistic update on failure
				this.holdings = originalHoldings;
				this.calculateDividendSummary();

				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to sell position');
			}

			// 3. BACKGROUND REFRESH for accuracy (non-blocking)
			this.#lastLoadTime = 0; // Invalidate cache
			await this.loadHoldings(portfolioId);

			return await response.json();
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Unknown error';
			throw error;
		} finally {
			this.isLoading = false;
		}
	};

	debugHoldings = () => {
		console.log(
			'All holdings:',
			this.holdings.map((h) => ({
				ticker: h.ticker,
				source: h.source,
				quantity: h.quantity,
				currentPrice: h.currentPrice,
				value: parseFloat(h.quantity) * (h.currentPrice || 0)
			}))
		);

		console.log('HDO holdings:', this.holdings.filter((h) => h.source === 'hdo').length);
		console.log('FMP holdings:', this.holdings.filter((h) => h.source === 'fmp').length);
		console.log(
			'Other sources:',
			this.holdings.filter((h) => h.source !== 'hdo' && h.source !== 'fmp')
		);
	};

	calculateHdoSectorAllocation = () => {
		const hdoHoldings = this.holdings.filter((h) => h.source === 'hdo' && h.hdoSector);

		if (hdoHoldings.length === 0) {
			return { sectors: [], totalHdoValue: 0 };
		}

		// Fixed: Use 'holding' as the parameter name (not 'holdings')
		const sectorTotals = hdoHoldings.reduce((acc, holding) => {
			const sector = holding.hdoSector;
			const value = parseFloat(holding.quantity) * (parseFloat(holding.livePrice) || 0);

			acc[sector] = (acc[sector] || 0) + value;
			return acc;
		}, {});

		const totalHdoValue = Object.values(sectorTotals).reduce((sum, value) => sum + value, 0);

		// Convert to array format for the donut chart
		const sectors = Object.entries(sectorTotals).map(([sector, value]) => ({
			sector,
			value,
			percentage: totalHdoValue > 0 ? (value / totalHdoValue) * 100 : 0
		}));

		// Sort by value (largest first)
		sectors.sort((a, b) => b.value - a.value);

		return { sectors, totalHdoValue };
	};

	toggleHdoFilter = () => {
		this.showHdoOnly = !this.showHdoOnly;
	};

	// Replace the refreshHoldingsData method in HoldingsManager.svelte.ts with this version:

	refreshHoldingsData = async () => {
		if (!portfolioManager.activePortfolioId) {
			return;
		}

		// If we have existing holdings, do a silent price update instead of full reload
		if (this.holdings.length > 0 && !this.#isBackgroundRefreshing) {
			console.log('🔄 Using silent price update (avoiding component reload)');
			await this.silentUpdatePrices();
			return;
		}

		// Original logic for full refresh (only when no holdings exist)
		this.#isBackgroundRefreshing = true;
		this.#refreshingForPortfolio = portfolioManager.activePortfolioId;

		try {
			console.log('🔄 Force refreshing holdings data (full reload)');

			// Store whether cache was recently invalidated (indicates new position)
			const wasRecentlyInvalidated = this.#lastLoadTime <= 1000;

			// ✅ Force refresh by clearing cache timestamp
			this.#lastLoadTime = 0;

			this.#isBackgroundRefreshing = false;

			// Use existing loadHoldings which will now hit DB due to invalid cache
			await this.loadHoldings(portfolioManager.activePortfolioId);

			this.#isBackgroundRefreshing = true;

			// 🔧 NEW: If cache was invalidated (new position), ensure UI updates with complete data
			if (wasRecentlyInvalidated) {
				console.log(
					'🔄 Background refresh complete after new position, triggering UI update for complete dividend data'
				);

				// Force Svelte reactivity by creating new array reference
				this.holdings = [...this.holdings];

				// Also trigger dividend summary recalculation
				this.calculateDividendSummary();
			}
		} catch (error) {
			console.warn('Holdings refresh failed:', error);
		} finally {
			this.#isBackgroundRefreshing = false;
			this.#refreshingForPortfolio = null;
		}
	};

	invalidateCache = () => {
		console.log('🗑️ Invalidating holdings cache');
		this.#lastLoadTime = 0;
		this.#lastLoadedPortfolio = null;
	};
	isHdoHolding = (ticker: string): boolean => {
		if (!ticker) return false;

		// Check if any holding in our current holdings list has this ticker and is HDO
		const holding = this.holdings.find((h) => h.ticker.toUpperCase() === ticker.toUpperCase());
		return holding?.source === 'hdo' || false;
	};

	silentUpdatePrices = async () => {
		if (!portfolioManager.activePortfolioId || this.holdings.length === 0) {
			console.log('⚠️ No holdings to update prices for');
			return;
		}

		try {
			console.log('💡 Silent price update: Using PriceManager + database prices');

			// 🔥 NEW: Get fresh prices from PriceManager state (primary source)
			const priceManagerPrices = priceManager.prices;
			console.log(`📊 PriceManager has ${Object.keys(priceManagerPrices).length} live prices`);

			// 🔥 ALSO: Get fresh prices from database (fallback/validation)
			const response = await fetch(`/api/portfolio/${portfolioManager.activePortfolioId}/holdings`);

			if (!response.ok) {
				console.warn('Silent price update failed, keeping existing data');
				return;
			}

			const data = await response.json();

			if (data.success && data.holdings?.length > 0) {
				// Create a map of fresh holdings by ticker for fast lookup
				const freshHoldingsMap = new Map();
				data.holdings.forEach((holding) => {
					if (holding && holding.ticker && typeof holding.ticker === 'string') {
						freshHoldingsMap.set(holding.ticker.toUpperCase(), holding);
					}
				});

				let updatedCount = 0;

				// 🔥 UPDATE: Use PriceManager prices first, then database as fallback
				this.holdings = this.holdings.map((existingHolding) => {
					// Check if ticker exists and is valid before processing
					if (
						!existingHolding ||
						!existingHolding.ticker ||
						typeof existingHolding.ticker !== 'string'
					) {
						console.warn('⚠️ Skipping existing holding with invalid ticker:', existingHolding);
						return existingHolding; // Return as-is
					}

					const ticker = existingHolding.ticker.toUpperCase();
					const freshHolding = freshHoldingsMap.get(ticker);

					// 🔥 PRIMARY: Get price from PriceManager state (most current)
					const priceManagerPrice = priceManagerPrices[ticker];

					// 🔥 FALLBACK: Get price from database
					const databasePrice = freshHolding ? parseFloat(freshHolding.livePrice) : null;

					// 🔥 CHOOSE: PriceManager first, then database, then existing
					const newPrice =
						priceManagerPrice || databasePrice || parseFloat(existingHolding.livePrice || 0);
					const currentPrice = parseFloat(existingHolding.livePrice || 0);

					// Check if price actually changed
					const priceChanged = Math.abs(newPrice - currentPrice) > 0.001; // Handle floating point precision

					if (priceChanged) {
						updatedCount++;

						return {
							...existingHolding,
							livePrice: newPrice.toString(), // Update the display price
							currentPrice: newPrice.toString(), // Update current price
							lastPriceUpdate: new Date().toISOString(),
							// Update performance data if available from database
							performance1D: freshHolding?.performance1D || existingHolding.performance1D,
							performance1M: freshHolding?.performance1M || existingHolding.performance1M,
							performanceYTD: freshHolding?.performanceYTD || existingHolding.performanceYTD,
							performance1Y: freshHolding?.performance1Y || existingHolding.performance1Y
						};
					}

					return existingHolding; // No changes needed
				});

				if (updatedCount > 0) {
					console.log(
						`✅ Silent update: Updated prices for ${updatedCount} holdings (${Object.keys(priceManagerPrices).length} from PriceManager)`
					);

					// Recalculate dividend summary with new prices
					this.calculateDividendSummary();

					// Update cache timestamp to prevent immediate reload
					this.#lastLoadTime = Date.now();
				} else {
					console.log('📊 Silent update: No price changes detected');
				}
			}
		} catch (error) {
			console.warn('Silent price update failed:', error);
			// Don't throw - just keep existing data
		}
	};

	// Add this method to HoldingsManager.svelte.ts after calculateHdoSectorAllocation
	// Replace the existing calculatePortfolioReturns method in HoldingsManager.svelte.ts
	calculatePortfolioReturns = (dividendTransactions = []) => {
		// Only calculate if we have valid data
		if (this.isLoading || this.holdings.length === 0) {
			return {
				hdo: {
					totalValue: 0,
					totalCost: 0,
					totalGainLoss: 0,
					totalGainLossPercent: 0,
					totalDividends: 0,
					totalReturn: 0,
					totalReturnPercent: 0
				},
				nonHdo: {
					totalValue: 0,
					totalCost: 0,
					totalGainLoss: 0,
					totalGainLossPercent: 0,
					totalDividends: 0,
					totalReturn: 0,
					totalReturnPercent: 0
				},
				total: {
					totalValue: 0,
					totalCost: 0,
					totalGainLoss: 0,
					totalGainLossPercent: 0,
					totalDividends: 0,
					totalReturn: 0,
					totalReturnPercent: 0
				}
			};
		}

		// Calculate dividend totals by HDO/non-HDO separation
		const hdoDividends = dividendTransactions
			.filter((tx) => tx.isHdo === true && !tx.isReinvested) // ← EXCLUDE REINVESTED
			.reduce((sum, tx) => sum + parseFloat(tx.totalDividend || 0), 0);

		const nonHdoDividends = dividendTransactions
			.filter((tx) => tx.isHdo === false && !tx.isReinvested) // ← EXCLUDE REINVESTED
			.reduce((sum, tx) => sum + parseFloat(tx.totalDividend || 0), 0);

		// HDO returns (exclude holdToSell) - EXISTING LOGIC
		const hdoHoldings = this.holdings.filter(
			(h) => h.source === 'hdo' && h.hdoCategory !== 'holdToSell'
		);
		const hdoReturns = hdoHoldings.reduce(
			(acc, holding) => {
				const quantity = parseFloat(holding.quantity || 0);
				const currentPrice = parseFloat(holding.livePrice) || parseFloat(holding.currentPrice) || 0;
				const averageCost = parseFloat(holding.averageCost) || 0;

				const value = quantity * currentPrice;
				const cost = quantity * averageCost;

				return {
					totalValue: acc.totalValue + value,
					totalCost: acc.totalCost + cost,
					totalGainLoss: acc.totalGainLoss + (value - cost)
				};
			},
			{ totalValue: 0, totalCost: 0, totalGainLoss: 0 }
		);

		// Total returns (all holdings) - EXISTING LOGIC
		const totalReturns = this.holdings.reduce(
			(acc, holding) => {
				const quantity = parseFloat(holding.quantity || 0);
				const currentPrice = parseFloat(holding.livePrice) || parseFloat(holding.currentPrice) || 0;
				const averageCost = parseFloat(holding.averageCost) || 0;

				const value = quantity * currentPrice;
				const cost = quantity * averageCost;

				return {
					totalValue: acc.totalValue + value,
					totalCost: acc.totalCost + cost,
					totalGainLoss: acc.totalGainLoss + (value - cost)
				};
			},
			{ totalValue: 0, totalCost: 0, totalGainLoss: 0 }
		);

		// Non-HDO returns (by subtraction) - EXISTING LOGIC
		const nonHdoReturns = {
			totalValue: totalReturns.totalValue - hdoReturns.totalValue,
			totalCost: totalReturns.totalCost - hdoReturns.totalCost,
			totalGainLoss: totalReturns.totalGainLoss - hdoReturns.totalGainLoss
		};

		// NEW: Enhanced return calculations with dividends and total returns
		const addDividendsAndTotals = (returns, dividends) => ({
			...returns,
			totalGainLossPercent:
				returns.totalCost > 0 ? (returns.totalGainLoss / returns.totalCost) * 100 : 0,
			totalDividends: dividends,
			totalReturn: returns.totalGainLoss + dividends,
			totalReturnPercent:
				returns.totalCost > 0 ? ((returns.totalGainLoss + dividends) / returns.totalCost) * 100 : 0
		});

		return {
			hdo: addDividendsAndTotals(hdoReturns, hdoDividends),
			nonHdo: addDividendsAndTotals(nonHdoReturns, nonHdoDividends),
			total: addDividendsAndTotals(totalReturns, hdoDividends + nonHdoDividends)
		};
	};
}

export const holdingsManager = new HoldingsManager();
