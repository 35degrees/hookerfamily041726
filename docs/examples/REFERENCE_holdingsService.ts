// src/lib/server/services/holdingsService.ts
import { db } from '../db/config';
import {
	holdings,
	holding,
	divDates,
	navBasedDivs,
	earningsCalendar,
	buyTransactions
} from '../db/schema';
import { eq, and, desc, asc, inArray, gte } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { fetchAllHdoHoldings, matchPreferredTicker } from './hdoService';
import { FMP_API_KEY } from '$env/static/private';
import { getPortfolioHoldings } from './portfolioService';
import { getSinglePrice } from './priceService';

// ===== MAIN ENTRY POINTS =====

function detectPreferredStock(ticker: string): boolean {
	if (!ticker) return false;

	// US Market preferred stock patterns:
	// CODI-PA, CODI-PB, CODI-PC = Preferred shares A, B, C
	// SCHW-PD, USB-PH, etc.
	return ticker.match(/^[A-Z]{2,5}-P[A-Z]$/) !== null;
}

function getSecurityCategory(ticker: string, profile: any): string {
	console.log(
		`🔍 getSecurityCategory called with ticker: "${ticker}", profile sector: "${profile?.sector}"`
	);

	if (detectPreferredStock(ticker)) {
		console.log(`✅ Detected preferred stock, returning "Preferred Stock"`);
		return 'Preferred Stock';
	}

	console.log(`✅ Not preferred stock, returning: "${profile?.sector || 'Market'}"`);
	return profile?.sector || 'Market';
}

/**
 * Ensure a ticker exists in the normalized holding table
 * If missing, fetch and normalize from HDO or FMP API
 */
export async function ensureHoldingExists(ticker: string) {
	const existingHolding = await db
		.select()
		.from(holding)
		.where(eq(holding.ticker, ticker.toUpperCase()))
		.limit(1);

	if (existingHolding.length > 0) {
		return existingHolding[0];
	}

	console.log(`Creating normalized holding for: ${ticker}`);

	const hdoData = await getHdoNormalizedData(ticker);

	if (hdoData) {
		return await createHoldingFromHdo(ticker, hdoData);
	} else {
		return await createHoldingFromFmp(ticker);
	}
}

/**
 * Add or update a user's holding position
 */
export async function addUserHolding(
	userId: string,
	portfolioId: string,
	holdingId: string,
	ticker: string,
	name: string,
	quantity: number,
	price: number,
	purchaseDate: Date
) {
	// Check if user already has this holding in this portfolio
	const existingPosition = await db
		.select()
		.from(holdings)
		.where(
			and(
				eq(holdings.userId, userId),
				eq(holdings.portfolioId, portfolioId),
				eq(holdings.holdingId, holdingId)
			)
		)
		.limit(1);

	if (existingPosition.length > 0) {
		// Update existing position (add quantity, recalculate average cost)
		const current = existingPosition[0];
		const currentQuantity = parseFloat(current.quantity.toString());
		const currentCost = parseFloat(current.averageCost?.toString() || '0');

		const newQuantity = currentQuantity + quantity;
		const newAverageCost = (currentQuantity * currentCost + quantity * price) / newQuantity;

		const result = await db
			.update(holdings)
			.set({
				quantity: newQuantity.toString(),
				averageCost: newAverageCost.toString(),
				updatedAt: new Date()
			})
			.where(eq(holdings.id, current.id))
			.returning();

		return result[0];
	} else {
		// Create new position
		const result = await db
			.insert(holdings)
			.values({
				id: randomUUID(),
				userId,
				portfolioId,
				holdingId,
				ticker,
				name,
				quantity: quantity.toString(),
				averageCost: price.toString(),
				createdAt: purchaseDate,
				updatedAt: new Date()
			})
			.returning();

		return result[0];
	}
}

export async function sellUserHolding(
	userId: string,
	portfolioId: string,
	ticker: string,
	quantityToSell: number,
	salePrice: number,
	saleDate: Date
) {
	const existingPosition = await db
		.select()
		.from(holdings)
		.where(
			and(
				eq(holdings.userId, userId),
				eq(holdings.portfolioId, portfolioId),
				eq(holdings.ticker, ticker.toUpperCase())
			)
		)
		.limit(1);

	if (existingPosition.length === 0) {
		throw new Error(`You don't own any shares of ${ticker}`);
	}

	const currentPosition = existingPosition[0];
	const currentQuantity = parseFloat(currentPosition.quantity.toString());

	if (quantityToSell > currentQuantity) {
		throw new Error(
			`cannot sell ${quantityToSell} shares, you only own ${currentQuantity} of ${ticker}`
		);
	}

	const newQuantity = currentQuantity - quantityToSell;

	if (newQuantity === 0) {
		await db.delete(holdings).where(eq(holdings.id, currentPosition.id));

		return {
			action: 'position_closed',
			ticker,
			quantitySold: quantityToSell,
			salePrice,
			proceeds: quantityToSell * salePrice
		};
	} else {
		const result = await db
			.update(holdings)
			.set({
				quantity: newQuantity.toString(),
				updatedAt: new Date()
			})
			.where(eq(holdings.id, currentPosition.id))
			.returning();

		return {
			action: 'partial_sale',
			ticker,
			quantitySold: quantityToSell,
			remainingShares: newQuantity,
			salePrice,
			proceeds: quantityToSell * salePrice,
			updatedPosition: result[0]
		};
	}
}

// ===== HDO DATA FETCHING =====

export async function getHdoNormalizedData(ticker: string) {
	console.log(`Looking up HDO data for: ${ticker}`);

	try {
		// Use your existing hdoService function directly (no HTTP call!)
		const allHdoData = await fetchAllHdoHoldings();

		// Search across all HDO categories using your existing logic
		const categories = ['core1', 'core2', 'cons1', 'cons2', 'cons3', 'holdToSell'];

		for (const category of categories) {
			const holdings = allHdoData[category] || [];

			// Use your existing ticker matching logic (handles preferred stocks, etc.)
			const match = holdings.find((holding) => {
				if (!holding?.ticker) return false;
				return matchPreferredTicker(ticker, holding.ticker);
			});

			if (match) {
				console.log(`Found HDO data for: ${ticker} in category: ${category}`);
				return {
					...match,
					source: 'hdo',
					category,
					// Add display name using your existing logic
					displayName:
						match.displayName ||
						match.stockName ||
						match.bondName ||
						match.fullNameDescription ||
						ticker
				};
			}
		}

		console.log(`No HDO data found for: ${ticker}`);
		return null;
	} catch (error) {
		console.error(`Error looking up HDO data for ${ticker}:`, error);
		return null;
	}
}
// ===== HDO NORMALIZATION =====

async function createHoldingFromHdo(ticker: string, hdoData: any) {
	const dates = await normalizeHdoDates(hdoData);
	const amounts = await getHdoDividendAmounts(hdoData);
	const divDatesData = await getPureDivDatesData(hdoData.ticker);
	const fmpBasicData = await getFmpSectorIndustry(hdoData.ticker);

	const getHdoCategory = (hdoData) => {
		if (hdoData.description) {
			return hdoData.description; // core1/core2: "Energy Infrastructure", "REIT", etc.
		}
		// Specific categories for bond/preferred tables
		switch (hdoData.category) {
			case 'cons1':
				return 'Preferred Stock';
			case 'cons2':
				return 'Baby Bond';
			case 'cons3':
				return 'Traditional Bond';
			default:
				return null;
		}
	};

	const earningsData = await getHdoEarningsData(hdoData.ticker);
	const divFreq = (hdoData.divFreq || amounts.frequency)?.trim();
	let quarterlyAmount = null;
	let monthlyAmount = null;

	if (hdoData.category === 'core1' || hdoData.category === 'core2') {
		// Use pure div_dates amount for core holdings
		quarterlyAmount =
			(divFreq === 'Q' || divFreq?.startsWith('Q ')) && divDatesData?.amount
				? divDatesData.amount.toString()
				: null;
		monthlyAmount = divFreq === 'M' && divDatesData?.amount ? divDatesData.amount.toString() : null;
	} else {
		// Calculate for cons1/cons2/cons3 from annual amount
		const annualAmount = amounts.annualAmount || 0;
		if (divFreq === 'Q' || divFreq?.startsWith('Q ')) {
			quarterlyAmount = annualAmount > 0 ? (annualAmount / 4).toString() : null;
		} else if (divFreq === 'M') {
			monthlyAmount = annualAmount > 0 ? (annualAmount / 12).toString() : null;
		}
		// ✅ NEW: Semi-annual support for bonds - no period amounts needed for SA
		// (bonds use annual amount divided by 2 for calculations)
	}

	const getBuyUnderValues = (hdoData) => {
		const hasText = hdoData.buyUnderText && hdoData.buyUnderText.trim();
		const numericValue = hdoData.buyUnderPrice || hdoData.buyUnder;
		if (hasText) {
			return { price: null, text: hdoData.buyUnderText };
		} else if (numericValue && numericValue > 0) {
			return { price: numericValue, text: null };
		} else {
			return { price: null, text: null };
		}
	};

	const buyUnder = getBuyUnderValues(hdoData);

	// ✅ NEW: Handle cons3 bond pricing
	let livePrice = null;
	let lastPriceUpdate = null;

	if (hdoData.category === 'cons3') {
		// For bonds, use lastPrice from cons3Holdings data
		livePrice = parseFloat(hdoData.lastPrice || 0);
		lastPriceUpdate = new Date();
		console.log(`🏦 Using cons3 bond price for ${ticker}: $${livePrice}`);
	}
	// For other holdings, livePrice stays null (will be updated by PriceManager)

	const normalizedData = {
		id: randomUUID(),
		ticker: ticker.toUpperCase(),
		sector: fmpBasicData?.sector || null, // FMP sector for all
		industry: fmpBasicData?.industry || null,
		name: hdoData.displayName || hdoData.stockName || hdoData.bondName || ticker,
		hdoSector: hdoData.hdoSector || (hdoData.category?.includes('cons') ? 'Fixed Inc' : null),
		category: getHdoCategory(hdoData),
		hdoCategory: hdoData.category,
		dividendYield: (hdoData.divYield || hdoData.currentYield || 0).toString(),
		annualAmount: amounts.annualAmount.toString(),
		dividendFrequency: amounts.frequency, // ✅ Now includes 'SA' for bonds
		// Store period amounts based on frequency
		quarterlyAmount,
		monthlyAmount,
		dividendStatus: divDatesData?.category || null,
		// Use normalized dates
		exDivDate: dates.exDivDate,
		payoutDate: dates.payoutDate,
		earningsDate: earningsData?.earningsDate || null,
		timing: earningsData?.timing || null,
		// HDO specific fields
		hdoNotes: hdoData.generalNotes,
		hdoDividendNotes: hdoData.dividendNotes,
		hdoRisk: hdoData.risk,
		buyUnderPrice: buyUnder.price,
		buyUnderText: buyUnder.text,
		suggestedAllocation: (hdoData.suggestedAllocation || 0).toString(),
		maxAllocation: (hdoData.maxAllocation || 0).toString(),
		issuesK1: hdoData.issueK1s || false,
		// ✅ UPDATED: Store the bond price data
		livePrice,
		lastPriceUpdate,
		source: 'hdo',
		processingStatus: 'complete',
		createdAt: new Date()
	};

	const result = await db.insert(holding).values(normalizedData).returning();
	console.log(`✅ Created HDO holding: ${ticker}`);
	return result[0];
}

async function getHdoEarningsData(ticker: string) {
	try {
		const earningsRecord = await db
			.select()
			.from(earningsCalendar) // Import this from your schema
			.where(eq(earningsCalendar.ticker, ticker))
			.limit(1);

		return earningsRecord.length > 0 ? earningsRecord[0] : null;
	} catch (error) {
		console.error(`Error fetching earnings data for ${ticker}:`, error);
		return null;
	}
}

async function getPureDivDatesData(ticker: string) {
	try {
		const divData = await db
			.select({
				amount: divDates.amount,
				category: divDates.category // 'Recent', 'Upcoming', 'Anticipated'
			})
			.from(divDates)
			.where(eq(divDates.ticker, ticker))
			.orderBy(divDates.exDivDate)
			.limit(1);

		return divData.length > 0 ? divData[0] : null;
	} catch (error) {
		console.error(`Error fetching div_dates for ${ticker}:`, error);
		return null;
	}
}

async function getFmpSectorIndustry(ticker: string) {
	try {
		const { getCompanyProfile } = await import('./fmpService');
		const profile = await getCompanyProfile(ticker);

		return {
			sector: profile?.sector || null,
			industry: profile?.industry || null
		};
	} catch (error) {
		console.warn(`Could not fetch FMP sector/industry for HDO holding ${ticker}:`, error);
		return { sector: null, industry: null };
	}
}

// In holdingsService.ts - improve the FMP fallback
async function createHoldingFromFmp(ticker: string) {
	console.log('Fetching FMP data for server normalization:', ticker);

	try {
		// Import your FMP service

		const { convertHdoToFmpTicker } = await import('./priceService');
		const fmpTicker = convertHdoToFmpTicker(ticker);

		console.log(`🔄 API Conversion: ${ticker} → ${fmpTicker} for FMP API calls`);
		const { getCompanyProfile, getQuote } = await import('./fmpService');

		// Get profile and quote data
		const [profile, quote] = await Promise.all([
			getCompanyProfile(fmpTicker), // ✅ Use fmpTicker
			getQuote(fmpTicker) // ✅ Use fmpTicker
		]);
		if (ticker.includes('-P') || ticker.includes('-')) {
			console.log(`\n🔍 PREFERRED STOCK ANALYSIS for ${ticker}`);
			console.log('='.repeat(50));

			// Profile data
			console.log('📊 PROFILE DATA:');
			console.log(`  Company Name: ${profile?.companyName}`);
			console.log(`  Description: ${profile?.description?.substring(0, 200)}...`);
			console.log(`  Sector: ${profile?.sector}`);
			console.log(`  Industry: ${profile?.industry}`);
			console.log(`  Exchange: ${profile?.exchange}`);
			console.log(`  exchangeShortName: ${profile?.exchangeShortName}`);
			console.log(`  Currency: ${profile?.currency}`);
			console.log(`  isEtf: ${profile?.isEtf}`);
			console.log(`  isFund: ${profile?.isFund}`);
			console.log(`  isActivelyTrading: ${profile?.isActivelyTrading}`);

			// Look for any field that might indicate security type
			const potentialTypeFields = Object.keys(profile || {}).filter(
				(key) =>
					key.toLowerCase().includes('type') ||
					key.toLowerCase().includes('class') ||
					key.toLowerCase().includes('security') ||
					key.toLowerCase().includes('preferred')
			);

			console.log(`  Potential type fields: ${potentialTypeFields.join(', ')}`);
			potentialTypeFields.forEach((field) => {
				console.log(`    ${field}: ${profile?.[field]}`);
			});

			// Quote data
			console.log('\n💰 QUOTE DATA:');
			console.log(`  Name: ${quote?.name}`);
			console.log(`  Exchange: ${quote?.exchange}`);
			console.log(`  Price: ${quote?.price}`);

			console.log('\n📋 ALL PROFILE FIELDS:');
			console.log(
				Object.keys(profile || {})
					.sort()
					.join(', ')
			);

			console.log('\n📋 ALL QUOTE FIELDS:');
			console.log(
				Object.keys(quote || {})
					.sort()
					.join(', ')
			);

			console.log('='.repeat(50));
		}

		// Get dividend data using your proven endpoint
		const apiUrl = `https://financialmodelingprep.com/stable/dividends?symbol=${fmpTicker}&apikey=${FMP_API_KEY}`;

		const response = await fetch(apiUrl);
		const dividends = await response.json();

		// Extract dividend info
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const oneYearAgo = new Date(today);
		oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

		// Find next upcoming dividend (earliest future payment date) // ← Fix this comment
		const futureDividends =
			dividends
				?.filter((div) => {
					if (!div.paymentDate) return false; // ✅ CHANGE: Filter by paymentDate
					const payDateStr = div.paymentDate.split('T')[0];
					return payDateStr > today.toISOString().split('T')[0]; // ✅ CHANGE: Compare paymentDate
				})
				.sort((a, b) => {
					const aPayDateStr = a.paymentDate.split('T')[0]; // ✅ CHANGE: Sort by paymentDate
					const bPayDateStr = b.paymentDate.split('T')[0];
					return aPayDateStr.localeCompare(bPayDateStr);
				}) || [];

		const nonSpecialDividends =
			dividends?.filter((div) => {
				const freq = (div.frequency || '').toLowerCase();
				return freq !== 'special' && freq !== 'one-time';
			}) || [];

		const nonSpecialFuture =
			futureDividends?.filter((div) => {
				const freq = (div.frequency || '').toLowerCase();
				return freq !== 'special' && freq !== 'one-time';
			}) || [];

		// Use next upcoming, or fall back to first dividend if none found
		const mostRecentDividend =
			nonSpecialFuture.length > 0
				? nonSpecialFuture[0] // ← Now gets the April "Quarterly" dividend
				: nonSpecialDividends.length > 0
					? nonSpecialDividends[0]
					: null;

		let isStale = false;
		if (mostRecentDividend) {
			// Check payment date (the actual cash flow date)
			const paymentDateStr = mostRecentDividend.paymentDate;
			if (paymentDateStr) {
				const paymentDate = new Date(paymentDateStr);
				paymentDate.setHours(0, 0, 0, 0);

				if (paymentDate < oneYearAgo) {
					console.log(
						`📅 Stale dividend detected for ${ticker}: Last payment was ${paymentDateStr} (over 1 year old)`
					);
					isStale = true;
				}
			}
		}
		let calculatedAnnualAmount = 0;
		const earningsInfo = await getNextEarningsDate(ticker);
		const normalizedFrequency = normalizeFrequency(mostRecentDividend?.frequency) || 'Unknown';
		if (normalizedFrequency === 'Irregular') {
			// ✅ Calculate trailing 12-month total using PAYMENT DATES
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

			const trailing12Months =
				dividends?.filter((div) => {
					if (!div.paymentDate) return false;
					const paymentDate = new Date(div.paymentDate);
					paymentDate.setHours(0, 0, 0, 0);
					return paymentDate >= oneYearAgo && paymentDate <= new Date();
				}) || [];

			calculatedAnnualAmount = trailing12Months.reduce((sum, div) => sum + (div.dividend || 0), 0);

			console.log(`📊 Irregular dividend calculation for ${ticker}:`, {
				trailing12MonthTotal: calculatedAnnualAmount,
				dividendCount: trailing12Months.length,
				paymentDates: trailing12Months.map((d) => ({
					paymentDate: d.paymentDate,
					amount: d.dividend
				}))
			});
		} else if (!isStale && mostRecentDividend?.dividend) {
			// ✅ Existing logic for regular frequencies
			calculatedAnnualAmount =
				mostRecentDividend.dividend *
				(normalizedFrequency === 'M'
					? 12
					: normalizedFrequency === 'Q'
						? 4
						: normalizedFrequency === 'A'
							? 1
							: 4);
		} else {
			calculatedAnnualAmount = 0;
		}

		// Calculate period amounts based on frequency (Issue 3 goes HERE)
		const quarterlyAmount =
			!isStale && normalizedFrequency === 'Q' && mostRecentDividend?.dividend
				? mostRecentDividend.dividend.toString()
				: null;
		const monthlyAmount =
			!isStale && normalizedFrequency === 'M' && mostRecentDividend?.dividend
				? mostRecentDividend.dividend.toString()
				: null;
		const irregularAmount =
			!isStale && normalizedFrequency === 'Irregular' && mostRecentDividend?.dividend
				? mostRecentDividend.dividend.toString()
				: null;

		const normalizedData = {
			id: randomUUID(),
			ticker: ticker.toUpperCase(),
			name: profile.companyName || ticker, // "Verizon Communications Inc."
			sector: profile.sector || null, // "Communication Services"
			industry: profile.industry || null, // "Telecommunications Services"
			category: getSecurityCategory(fmpTicker, profile),
			// Enhanced dividend data from your proven endpoint
			dividendYield:
				!isStale && mostRecentDividend?.yield ? mostRecentDividend.yield.toString() : null,
			annualAmount:
				!isStale && calculatedAnnualAmount > 0 ? calculatedAnnualAmount.toString() : null,
			dividendFrequency: normalizedFrequency,

			// Add the calculated period amounts here
			quarterlyAmount,
			monthlyAmount,
			irregularAmount,
			livePrice: quote?.price || 0,
			lastPriceUpdate: new Date(),

			// Date fields
			exDivDate: !isStale ? parseFmpDate(mostRecentDividend?.date) : null,
			payoutDate: !isStale ? parseFmpDate(mostRecentDividend?.paymentDate) : null,
			recordDate: !isStale ? parseFmpDate(mostRecentDividend?.recordDate) : null,
			earningsDate: earningsInfo.earningsDate,
			timing: earningsInfo.timing,
			source: 'fmp', // Proper source
			processingStatus: 'complete',
			createdAt: new Date()
		};

		console.log(`Server normalized FMP data for ${ticker}:`, {
			name: normalizedData.name,
			sector: normalizedData.sector,
			industry: normalizedData.industry,
			dividendYield: normalizedData.dividendYield,
			dividendFrequency: normalizedData.dividendFrequency,
			source: normalizedData.source
		});

		const result = await db.insert(holding).values(normalizedData).returning();
		return result[0];
	} catch (error) {
		console.error(`Error fetching FMP data for ${ticker}:`, error);
		// Fallback to basic record
		const basicData = {
			id: randomUUID(),
			ticker: ticker.toUpperCase(),
			name: ticker,
			source: 'fmp-error',
			processingStatus: 'error',
			createdAt: new Date()
		};

		const result = await db.insert(holding).values(basicData).returning();
		return result[0];
	}
}

function normalizeFrequency(frequency) {
	if (!frequency) return 'Unknown';
	const freq = frequency.toString().toLowerCase();
	if (freq === 'quarterly') return 'Q';
	if (freq === 'monthly') return 'M';
	if (freq === 'annual') return 'A';
	if (freq === 'semi-annual' || freq === 'semiannual') return 'SA';
	if (freq === 'irregular') return 'Irregular';
	if (freq === 'special' || freq === 'one-time') {
		return 'Unknown';
	}
	return frequency; // Return original if not recognized
}
// ===== HDO DIVIDEND AMOUNT CALCULATION =====

/**
 * Get both period and annual amounts from HDO data
 */
async function getHdoDividendAmounts(hdoData: any) {
	const category = hdoData.category;

	switch (category) {
		case 'cons1':
			// Calculate correct period amount (don't trust quarterly_coupon_amount field)
			const annualAmount = parseFloat(hdoData.annualCouponAmount || 0);
			const frequency = (hdoData.divFreq || 'Q').trim();

			let periodAmount = 0;
			if (frequency === 'Q' || frequency.startsWith('Q ')) {
				periodAmount = annualAmount / 4; // True quarterly amount
			} else if (frequency === 'M') {
				periodAmount = annualAmount / 12; // True monthly amount
			}

			return {
				annualAmount,
				periodAmount,
				frequency
			};

		case 'cons2':
			// cons2 is correct - all quarterly, so period_dividend is truly quarterly
			return {
				annualAmount: parseFloat(hdoData.annualDividend || 0),
				periodAmount: parseFloat(hdoData.periodDividend || 0),
				frequency: hdoData.divFreq || 'Q'
			};

		case 'cons3':
			// ✅ UPDATED: Bonds - calculate semi-annual from annual coupon
			const annualCoupon = parseFloat(hdoData.coupon || 0);
			const semiAnnualAmount = annualCoupon / 2; // Bonds pay semi-annually

			return {
				annualAmount: annualCoupon,
				periodAmount: semiAnnualAmount, // Semi-annual payment per share
				frequency: 'SA' // Semi-annual frequency
			};

		case 'core1':
		case 'core2':
		case 'holdToSell':
			// Calculate from div_dates
			const amounts = await getCore12Amounts(hdoData.ticker, hdoData.divFreq);
			return amounts;

		default:
			return { annualAmount: 0, periodAmount: 0, frequency: 'Unknown' };
	}
}

/**
 * Calculate both period and annual amounts for core1/core2
 */
async function getCore12Amounts(ticker: string, divFreq: string) {
	try {
		const navOverrides = await db
			.select()
			.from(navBasedDivs)
			.where(eq(navBasedDivs.ticker, ticker))
			.limit(1);

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// ✅ MANUAL FORMATTING: Avoid timezone issues
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		const todayStr = `${year}-${month}-${day}`;

		// First try to get future dividends
		const futureDivData = await db
			.select()
			.from(divDates)
			.where(and(eq(divDates.ticker, ticker), gte(divDates.exDivDate, todayStr)))
			.orderBy(divDates.exDivDate)
			.limit(1);

		let divData = futureDivData;

		// Fallback to most recent if no future dates
		if (divData.length === 0) {
			divData = await db
				.select()
				.from(divDates)
				.where(eq(divDates.ticker, ticker))
				.orderBy(desc(divDates.exDivDate))
				.limit(1);
		}

		if (divData.length === 0) {
			return { annualAmount: 0, periodAmount: 0, frequency: divFreq || 'Unknown' };
		}

		const periodAmount = parseFloat(divData[0].amount?.toString() || '0');
		let annualAmount = 0;
		const cleanFreq = divFreq?.trim();

		if (navOverrides.length > 0) {
			annualAmount = parseFloat(navOverrides[0].annualDividend?.toString() || '0');
		} else {
			// Use standard calculation
			if (cleanFreq === 'Q' || cleanFreq?.startsWith('Q ')) {
				annualAmount = periodAmount * 4;
			} else if (cleanFreq === 'M') {
				annualAmount = periodAmount * 12;
			} else {
				annualAmount = periodAmount;
			}
		}

		return {
			annualAmount,
			periodAmount,
			frequency: cleanFreq || 'Unknown'
		};
	} catch (error) {
		console.error(`Error calculating amounts for ${ticker}:`, error);
		return { annualAmount: 0, periodAmount: 0, frequency: 'Unknown' };
	}
}

// ===== HDO DATE NORMALIZATION =====

async function normalizeHdoDates(hdoData: any) {
	switch (hdoData.category) {
		case 'core1':
		case 'core2':
			return await getCore12Dates(hdoData.ticker);
		case 'holdToSell':
			return await getCore12Dates(hdoData.ticker);
		case 'cons1':
			return getCons1Dates(hdoData);
		case 'cons2':
			return getCons2Dates(hdoData);
		case 'cons3':
			return getCons3Dates(hdoData);
		default:
			return { exDivDate: null, payoutDate: null, amount: 0 };
	}
}

/**
 * Get dates from div_dates table for core1/core2 holdings
 */
async function getCore12Dates(ticker: string) {
	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// ✅ MANUAL FORMATTING: Avoid timezone issues
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		const todayStr = `${year}-${month}-${day}`;

		console.log(`🔍 getCore12Dates for ${ticker}: Today is ${todayStr}`);

		const allDivData = await db
			.select()
			.from(divDates)
			.where(eq(divDates.ticker, ticker))
			.orderBy(divDates.exDivDate);

		console.log(
			`📋 ${ticker} ALL div_dates:`,
			allDivData.map((d) => ({
				exDivDate: d.exDivDate,
				category: d.category,
				amount: d.amount,
				isAfterToday: d.exDivDate >= todayStr
			}))
		);

		const parseDbDate = (dateString) => {
			if (!dateString) return null;
			const dateOnly = dateString.split('T')[0];
			const [year, month, day] = dateOnly.split('-');
			return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
		};

		// PRIORITY 1: Find records where pay_date is future (even if ex_div_date is past)
		const futurePaidRecords = allDivData.filter((record) => {
			if (!record.payDate) return false;
			const payDate = parseDbDate(record.payDate);
			return payDate && payDate > today;
		});

		if (futurePaidRecords.length > 0) {
			// Sort by pay date and take earliest
			futurePaidRecords.sort((a, b) => {
				const aPayDate = parseDbDate(a.payDate);
				const bPayDate = parseDbDate(b.payDate);
				return aPayDate.getTime() - bPayDate.getTime();
			});

			const nextPayRecord = futurePaidRecords[0];
			console.log(`✅ ${ticker} using future pay date record:`, {
				exDivDate: nextPayRecord.exDivDate,
				payDate: nextPayRecord.payDate,
				amount: nextPayRecord.amount
			});
			return {
				exDivDate: nextPayRecord.exDivDate,
				payoutDate: nextPayRecord.payDate,
				amount: nextPayRecord.amount
			};
		}

		// PRIORITY 2: Fallback to future ex-div dates only if no future pay dates
		const futureDivData = allDivData.filter((record) => {
			const exDivDate = parseDbDate(record.exDivDate);
			return exDivDate && exDivDate > today;
		});

		if (futureDivData.length > 0) {
			console.log(`⚠️ ${ticker} fallback to future ex-div record:`, {
				exDivDate: futureDivData[0].exDivDate,
				payDate: futureDivData[0].payDate,
				amount: futureDivData[0].amount
			});
			return {
				exDivDate: futureDivData[0].exDivDate,
				payoutDate: futureDivData[0].payDate,
				amount: futureDivData[0].amount
			};
		}

		// Fallback to most recent if no future dates
		const recentDivData = await db
			.select()
			.from(divDates)
			.where(eq(divDates.ticker, ticker))
			.orderBy(desc(divDates.exDivDate))
			.limit(1);

		if (recentDivData.length > 0) {
			return {
				exDivDate: recentDivData[0].exDivDate,
				payoutDate: recentDivData[0].payDate,
				amount: recentDivData[0].amount
			};
		}

		return { exDivDate: null, payoutDate: null, amount: 0 };
	} catch (error) {
		console.error(`Error fetching div_dates for ${ticker}:`, error);
		return { exDivDate: null, payoutDate: null, amount: 0 };
	}
}

/**
 * Get dates from cons1 holdings (preferred stocks)
 */
function getCons1Dates(hdoData: any) {
	const result = {
		exDivDate: hdoData.exDivDate || null,
		payoutDate: null,
		amount: parseFloat(hdoData.annualCouponAmount || 0)
	};

	// Parse payment date from text fields
	if (hdoData.dividendPayDateText && hdoData.dividendPayDateValue) {
		const paymentDate = parseConsPreferredDates(hdoData);
		result.payoutDate = paymentDate.payoutDate;

		// If no explicit exDivDate, calculate it from payment date
		if (!result.exDivDate && result.payoutDate) {
			const exDiv = new Date(result.payoutDate);
			exDiv.setDate(exDiv.getDate() - 3);
			result.exDivDate = adjustForWeekends(exDiv);
		}
	}

	return result;
}

/**
 * Get dates from cons2 holdings
 */
function getCons2Dates(hdoData: any) {
	const result = {
		exDivDate: hdoData.exDivDate || null,
		payoutDate: hdoData.payDate || null,
		amount: parseFloat(hdoData.annualDividend || 0)
	};

	// Parse ex-div date from text if no explicit timestamp
	if (!result.exDivDate && hdoData.exDivDateText) {
		result.exDivDate = parseExDivDateText(hdoData.exDivDateText, hdoData.exDivMonths);
	}

	// Parse payment date from text if no explicit timestamp
	if (!result.payoutDate && hdoData.payDateText) {
		result.payoutDate = parsePayDateText(hdoData.payDateText, hdoData.payDateMonths);
	}

	return result;
}

/**
 * Get dates from cons3 holdings (bonds)
 */
function getCons3Dates(hdoData: any) {
	return {
		exDivDate: null, // Bonds don't have ex-div dates
		payoutDate: parseNextPaymentDate(hdoData.nextPayment),
		amount: parseFloat(hdoData.coupon || 0)
	};
}

// ===== DATE PARSING UTILITIES =====

// In holdingsService.ts, update parseConsPreferredDates() function:

function parseConsPreferredDates(hdoData: any) {
	if (!hdoData.dividendPayDateText || !hdoData.dividendPayDateValue) {
		return { exDivDate: null, payoutDate: null };
	}

	const dayText = hdoData.dividendPayDateText.toLowerCase();
	const monthsText = hdoData.dividendPayDateValue.toLowerCase();

	let dayOfMonth: number | string;
	if (dayText.includes('last')) {
		dayOfMonth = 'last';
	} else {
		const dayMatch = dayText.match(/(\d+)/);
		dayOfMonth = dayMatch ? parseInt(dayMatch[1]) : 15;
	}

	// ✅ NEW: Handle monthly payers (ARR-C case)
	if (monthsText.includes('each month') || monthsText.includes('monthly')) {
		console.log(
			`📅 Monthly cons1 payment detected for ${hdoData.ticker}: ${dayOfMonth}th of each month`
		);
		return {
			exDivDate: null,
			payoutDate: findNextMonthlyPaymentDate(dayOfMonth)
		};
	}

	// ✅ EXISTING: Handle quarterly/specific month patterns
	const monthAbbreviations = monthsText.match(/[A-Za-z]{3}/g) || [];
	if (monthAbbreviations.length === 0) {
		return { exDivDate: null, payoutDate: null };
	}

	const nextPaymentDate = findNextPaymentDate(dayOfMonth, monthAbbreviations);
	return {
		exDivDate: null, // Will be calculated in getCons1Dates if needed
		payoutDate: nextPaymentDate
	};
}

function findNextMonthlyPaymentDate(dayOfMonth: number | string): Date {
	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth(); // 0-based (June = 5)

	// Try current month first
	let paymentDate: Date;
	if (dayOfMonth === 'last') {
		paymentDate = new Date(currentYear, currentMonth + 1, 0); // Last day of current month
	} else {
		paymentDate = new Date(currentYear, currentMonth, dayOfMonth as number);
	}

	// Adjust for weekends
	paymentDate = adjustForWeekends(paymentDate);

	// If payment date has passed this month, use next month
	if (paymentDate <= today) {
		if (dayOfMonth === 'last') {
			paymentDate = new Date(currentYear, currentMonth + 2, 0); // Last day of next month
		} else {
			paymentDate = new Date(currentYear, currentMonth + 1, dayOfMonth as number);
		}
		paymentDate = adjustForWeekends(paymentDate);
	}

	console.log(`📅 Next monthly payment for ${dayOfMonth}th: ${paymentDate.toDateString()}`);
	return paymentDate;
}

function parseExDivDateText(dateText: string, monthsText: string): Date | null {
	if (!dateText || !monthsText) return null;

	const dayMatch = dateText.match(/(\d+)/);
	if (!dayMatch) return null;

	const dayOfMonth = parseInt(dayMatch[1]);
	const monthAbbreviations = monthsText.match(/[A-Za-z]{3}/g) || [];

	if (monthAbbreviations.length === 0) return null;

	const nextDate = findNextPaymentDate(dayOfMonth, monthAbbreviations);
	return adjustForWeekends(nextDate);
}

function parsePayDateText(dateText: string, monthsText: string): Date | null {
	// Similar logic to parseExDivDateText
	return parseExDivDateText(dateText, monthsText);
}

/**
 * Parse cons3 bond payment dates in "MM/DD" format
 * Handles year rollover when current month > payment month
 */
function parseNextPaymentDate(nextPaymentText: string): Date | null {
	if (!nextPaymentText) return null;

	// Parse "MM/DD" format like "10/15" or "7/15"
	const match = nextPaymentText.match(/^(\d{1,2})\/(\d{1,2})$/);
	if (!match) return null;

	const month = parseInt(match[1]);
	const day = parseInt(match[2]);

	// Validate month and day
	if (month < 1 || month > 12 || day < 1 || day > 31) return null;

	const today = new Date();
	const currentYear = today.getFullYear();

	// Create date for this year
	let paymentDate = new Date(currentYear, month - 1, day);

	// If the payment date has passed this year, use next year
	if (paymentDate < today) {
		paymentDate = new Date(currentYear + 1, month - 1, day);
	}

	// Adjust for weekends (bonds pay on business days)
	return adjustForWeekends(paymentDate);
}

function findNextPaymentDate(dayOfMonth: number | string, monthAbbreviations: string[]): Date {
	const today = new Date();
	const currentYear = today.getFullYear();

	const monthNumbers = monthAbbreviations.map((abbr) => getMonthNumber(abbr));

	let targetYear = currentYear;

	// Check each payment month to find the next one
	for (const month of monthNumbers) {
		let paymentDate: Date;

		if (dayOfMonth === 'last') {
			paymentDate = new Date(targetYear, month, 0); // Last day of month
		} else {
			paymentDate = new Date(targetYear, month - 1, dayOfMonth as number);
		}

		// Adjust for weekends first
		paymentDate = adjustForWeekends(paymentDate);

		// If this payment date is in the future, use it
		if (paymentDate > today) {
			return paymentDate;
		}
	}

	// If no payment date found this year, roll to next year
	targetYear = currentYear + 1;
	const firstMonth = monthNumbers[0];
	let paymentDate: Date;

	if (dayOfMonth === 'last') {
		paymentDate = new Date(targetYear, firstMonth, 0);
	} else {
		paymentDate = new Date(targetYear, firstMonth - 1, dayOfMonth as number);
	}

	return adjustForWeekends(paymentDate);
}

function adjustForWeekends(date: Date): Date {
	const dayOfWeek = date.getDay();

	if (dayOfWeek === 0) {
		// Sunday
		date.setDate(date.getDate() - 2); // Move to Friday
	} else if (dayOfWeek === 6) {
		// Saturday
		date.setDate(date.getDate() - 1); // Move to Friday
	}

	return date;
}

function getMonthNumber(monthAbbr: string): number {
	const monthMap: { [key: string]: number } = {
		JAN: 1,
		FEB: 2,
		MAR: 3,
		APR: 4,
		MAY: 5,
		JUN: 6,
		JUL: 7,
		AUG: 8,
		SEP: 9,
		OCT: 10,
		NOV: 11,
		DEC: 12
	};

	const normalized = monthAbbr.toUpperCase().substring(0, 3);
	return monthMap[normalized] || 1;
}

async function getNextEarningsDate(ticker: string) {
	try {
		const apiUrl = `https://financialmodelingprep.com/api/v3/historical/earning_calendar/${ticker}?apikey=${FMP_API_KEY}`;

		const response = await fetch(apiUrl);
		const earningsData = await response.json();

		if (!earningsData || !Array.isArray(earningsData) || earningsData.length === 0) {
			console.log(`No earnings data found for ${ticker}`);
			return { earningsDate: null, timing: null };
		}

		// Filter for future dates only
		const today = new Date();
		const futureEarnings = earningsData.filter((item) => {
			const earningsDate = new Date(item.date);
			return earningsDate > today;
		});

		if (futureEarnings.length === 0) {
			console.log(`No future earnings found for ${ticker}`);
			return { earningsDate: null, timing: null };
		}

		// Sort by date and get the earliest future date
		futureEarnings.sort((a, b) => +new Date(a.date) - +new Date(b.date));
		const nextEarnings = futureEarnings[0];

		console.log(`Next earnings for ${ticker}:`, {
			date: nextEarnings.date,
			time: nextEarnings.time
		});

		// Map to HDO format
		let timing = null;
		if (nextEarnings.time === 'bmo') {
			timing = 'before open';
		} else if (nextEarnings.time === 'amc') {
			timing = 'after close';
		}

		return {
			earningsDate: nextEarnings.date ? new Date(nextEarnings.date) : null,
			timing
		};
	} catch (error) {
		console.warn(`Could not fetch earnings data for ${ticker}:`, error);
		return { earningsDate: null, timing: null };
	}
}

async function calculateEligibleSharesBatch(userId: string, portfolioId: string, holdings: any[]) {
	try {
		// Get ALL buy transactions for this portfolio in one query
		const allTransactions = await db
			.select({
				ticker: buyTransactions.ticker,
				quantity: buyTransactions.quantity,
				transactionDate: buyTransactions.transactionDate
			})
			.from(buyTransactions)
			.where(and(eq(buyTransactions.userId, userId), eq(buyTransactions.portfolioId, portfolioId)));

		console.log(
			`Fetched ${allTransactions.length} transactions for batch eligible shares calculation`
		);

		// Group transactions by ticker for fast lookup
		const transactionsByTicker = new Map<string, typeof allTransactions>();

		allTransactions.forEach((transaction) => {
			const ticker = transaction.ticker.toUpperCase();
			if (!transactionsByTicker.has(ticker)) {
				transactionsByTicker.set(ticker, []);
			}
			transactionsByTicker.get(ticker)!.push(transaction);
		});

		// Calculate eligible shares for each holding
		const eligibleSharesMap = new Map<string, number>();

		holdings.forEach((holding) => {
			const ticker = holding.ticker.toUpperCase();
			const exDivDate = holding.exDivDate;

			if (!exDivDate) {
				eligibleSharesMap.set(ticker, 0);
				return;
			}

			const transactions = transactionsByTicker.get(ticker) || [];

			if (transactions.length === 0) {
				eligibleSharesMap.set(ticker, 0);
				return;
			}

			const exDiv = new Date(exDivDate);
			let totalShares = 0;
			let ineligibleShares = 0;

			transactions.forEach((transaction) => {
				const shares = parseFloat(transaction.quantity.toString());
				const transactionDate = new Date(transaction.transactionDate);

				totalShares += shares;

				// If purchased ON or AFTER ex-div date, not eligible
				if (transactionDate >= exDiv) {
					ineligibleShares += shares;
				}
			});

			const eligibleShares = totalShares - ineligibleShares;
			eligibleSharesMap.set(ticker, eligibleShares);
		});

		return eligibleSharesMap;
	} catch (error) {
		console.error('Error calculating batch eligible shares:', error);
		return new Map<string, number>();
	}
}

// REPLACE the calculateNextEligibleIncomeAmount() function in holdingsService.ts with this:

function calculateNextEligibleIncomeAmountBatch(
	holding: any,
	userHolding: any,
	eligibleSharesMap: Map<string, number>
) {
	// Return 0 if no ex-dividend date
	if (!holding || !userHolding) {
		console.error('❌ calculateNextEligibleIncomeAmountBatch: missing holding data', {
			holding: !!holding,
			userHolding: !!userHolding,
			ticker: userHolding?.ticker || 'unknown'
		});
		return 0;
	}

	const dividendAmount = getNextDividendAmount(holding, userHolding);
	if (dividendAmount === 0) {
		return 0;
	}

	const totalShares = parseFloat(userHolding.quantity || 0); // Use userHolding for quantity
	const incomeAmount = dividendAmount * totalShares;

	console.log(
		`💰 ${holding.ticker}: $${dividendAmount} × ${totalShares} shares = $${incomeAmount.toFixed(2)}`
	);

	return incomeAmount;
}

// Keep the getNextDividendAmount() function exactly as-is - no changes needed

// Helper function to extract dividend amount based on frequency
function getNextDividendAmount(holding: any, userHolding?: any) {
	// FIRST: Check for user dividend override
	if (userHolding?.hasUserOverride && userHolding?.dividendOverride) {
		const overrideAnnual = parseFloat(userHolding.dividendOverride);
		const frequency = holding.dividendFrequency?.toUpperCase().trim();

		console.log(`🎯 Using dividend override for ${holding.ticker}: $${overrideAnnual} annual`);

		// Calculate period amount from override
		switch (frequency) {
			case 'M':
				return overrideAnnual / 12;
			case 'Q':
			case 'Q *':
				return overrideAnnual / 4;
			case 'SA':
				return overrideAnnual / 2;
			case 'A':
				return overrideAnnual;
			default:
				return overrideAnnual / 4; // Default to quarterly
		}
	}

	// EXISTING LOGIC: Use HDO/FMP values (unchanged from your original)
	if (!holding.dividendFrequency) return 0;

	const frequency = holding.dividendFrequency.toUpperCase().trim();

	// Use period amounts if available
	if (frequency === 'M' && holding.monthlyAmount) {
		return parseFloat(holding.monthlyAmount);
	}

	if ((frequency === 'Q' || frequency.startsWith('Q ')) && holding.quarterlyAmount) {
		return parseFloat(holding.quarterlyAmount);
	}

	if (frequency === 'SA' && holding.periodAmount) {
		console.log(`💰 Using semi-annual amount for bond ${holding.ticker}: $${holding.periodAmount}`);
		return parseFloat(holding.periodAmount);
	}
	if (frequency === 'IRREGULAR' && holding.irregularAmount) {
		return parseFloat(holding.irregularAmount);
	}

	// Fall back to calculating from annual amount
	if (holding.annualAmount) {
		const annual = parseFloat(holding.annualAmount);
		switch (frequency) {
			case 'M':
				return annual / 12;
			case 'Q':
			case 'Q *':
				return annual / 4;
			case 'SA':
				return annual / 2;
			case 'A':
				return annual;
			default:
				return 0;
		}
	}

	return 0;
}

// UPDATE your getPortfolioHoldingsComplete() function in holdingsService.ts:

// export async function getPortfolioHoldingsComplete(userId: string, portfolioId: string) {
// 	const portfolioStartTime = Date.now();

// 	try {
// 		console.log(`🚀 TESTING: Starting portfolio enhancement for: ${portfolioId}`);

// 		const rawHoldings = await getPortfolioHoldings(userId, portfolioId);
// 		if (rawHoldings.length === 0) {
// 			return [];
// 		}

// 		console.log(`📊 Processing ${rawHoldings.length} holdings with INDIVIDUAL lookup (testing)`);

// 		// ❌ BATCH OPTIMIZATION TEMPORARILY DISABLED FOR TESTING
// 		// const allTickers = rawHoldings.map(h => h.ticker);
// 		// const batchHdoData = await getBatchHdoData(allTickers);
// 		// const hdoMap = new Map();

// 		// ✅ REVERT TO INDIVIDUAL PROCESSING (like before optimization)
// 		const enhancedHoldings = await Promise.all(
// 			rawHoldings.map(async (holding) => {
// 				console.log(`🔍 Processing ${holding.ticker} individually`);
// 				return await enhancedHoldingComplete(holding, userId, portfolioId, null, false);
// 				//                                                                        ^^^^
// 				//                                                                    Force fallback to individual queries
// 			})
// 		);

// 		// Your existing income calculations (unchanged)
// 		console.log('Calculating eligible shares batch...');
// 		const eligibleSharesMap = await calculateEligibleSharesBatch(
// 			userId,
// 			portfolioId,
// 			enhancedHoldings
// 		);

// 		const holdingsWithIncome = enhancedHoldings.map((holding) => {
// 			const nextEligibleIncomeAmount = calculateNextEligibleIncomeAmountBatch(
// 				holding,
// 				holding,
// 				eligibleSharesMap
// 			);
// 			return {
// 				...holding,
// 				nextEligibleIncomeAmount
// 			};
// 		});

// 		const totalTime = Date.now() - portfolioStartTime;
// 		const avgTime = Math.round(totalTime / holdingsWithIncome.length);

// 		// ✅ PERFORMANCE REPORTING
// 		console.log(`🎯 TESTING MODE: ${totalTime}ms for ${holdingsWithIncome.length} holdings`);
// 		console.log(`📊 Individual average: ${avgTime}ms per holding`);

// 		const proj50 = Math.round(((avgTime * 50) / 1000) * 10) / 10;
// 		const proj100 = Math.round(((avgTime * 100) / 1000) * 10) / 10;
// 		const proj200 = Math.round(((avgTime * 200) / 1000) * 10) / 10;

// 		console.log(
// 			`📈 INDIVIDUAL PROJECTIONS - 50 holdings: ${proj50}s | 100 holdings: ${proj100}s | 200 holdings: ${proj200}s`
// 		);

// 		console.log(
// 			`✅ Processed ${holdingsWithIncome.length} complete holdings with income calculations`
// 		);
// 		return holdingsWithIncome;
// 	} catch (error) {
// 		const totalTime = Date.now() - portfolioStartTime;
// 		console.error(`❌ Testing mode enhancement failed after ${totalTime}ms:`, error);
// 		throw error;
// 	}
// }
export async function getPortfolioHoldingsComplete(userId: string, portfolioId: string) {
	const portfolioStartTime = Date.now();

	try {
		console.log(`🚀 BATCH OPTIMIZED: Starting portfolio enhancement for: ${portfolioId}`);

		const rawHoldings = await getPortfolioHoldings(userId, portfolioId);
		if (rawHoldings.length === 0) {
			return [];
		}

		console.log(`📊 Processing ${rawHoldings.length} holdings with BATCH lookup`);

		// ✅ STEP 1: Get all HDO data in one query upfront
		const allTickers = rawHoldings.map((h) => h.ticker);
		console.log(`🎯 BATCH: Extracting tickers = [${allTickers.join(', ')}]`);

		const batchStartTime = Date.now();
		const batchHdoData = await getBatchHdoData(allTickers);
		const batchTime = Date.now() - batchStartTime;

		console.log(`⚡ BATCH: Retrieved ${batchHdoData.length} HDO records in ${batchTime}ms`);

		// Convert batch results to lookup map for instant access
		const hdoMap = new Map();
		batchHdoData.forEach((record) => {
			hdoMap.set(record.ticker.toUpperCase(), record);
			console.log(`📋 BATCH: Mapped ${record.ticker} → ${record.hdoCategory} (${record.source})`);
		});

		// ✅ STEP 2: Process holdings using pre-fetched HDO map
		const enhancementStartTime = Date.now();
		const enhancedHoldings = await Promise.all(
			rawHoldings.map(async (holding) => {
				const hdoData = hdoMap.get(holding.ticker.toUpperCase());
				if (hdoData) {
					console.log(`⚡ INSTANT: Using batch HDO data for ${holding.ticker}`);
				} else {
					console.log(`📍 NON-HDO: ${holding.ticker} will use FMP processing`);
				}
				return await enhancedHoldingComplete(holding, userId, portfolioId, hdoData, true);
			})
		);
		const enhancementTime = Date.now() - enhancementStartTime;

		console.log(
			`🔧 ENHANCEMENT: Processed ${enhancedHoldings.length} holdings in ${enhancementTime}ms`
		);

		// Your existing income calculations
		console.log('Calculating eligible shares batch...');
		const eligibleSharesMap = await calculateEligibleSharesBatch(
			userId,
			portfolioId,
			enhancedHoldings
		);

		const holdingsWithIncome = enhancedHoldings.map((holding) => {
			const nextEligibleIncomeAmount = calculateNextEligibleIncomeAmountBatch(
				holding,
				holding,
				eligibleSharesMap
			);
			return {
				...holding,
				nextEligibleIncomeAmount
			};
		});

		const totalTime = Date.now() - portfolioStartTime;
		const avgTime = Math.round(totalTime / holdingsWithIncome.length);

		// ✅ PERFORMANCE REPORTING
		console.log(`🎯 BATCH OPTIMIZED: ${totalTime}ms for ${holdingsWithIncome.length} holdings`);
		console.log(`📊 Batch average: ${avgTime}ms per holding`);
		console.log(
			`⚡ Batch query time: ${batchTime}ms (vs ${rawHoldings.length} individual queries)`
		);

		// ✅ REALISTIC PROJECTIONS
		const proj50 = Math.round(((avgTime * 50) / 1000) * 10) / 10;
		const proj100 = Math.round(((avgTime * 100) / 1000) * 10) / 10;
		const proj200 = Math.round(((avgTime * 200) / 1000) * 10) / 10;

		console.log(
			`📈 BATCH PROJECTIONS - 50 holdings: ${proj50}s | 100 holdings: ${proj100}s | 200 holdings: ${proj200}s`
		);

		console.log(
			`✅ Processed ${holdingsWithIncome.length} complete holdings with income calculations`
		);
		return holdingsWithIncome;
	} catch (error) {
		const totalTime = Date.now() - portfolioStartTime;
		console.error(`❌ Batch optimized portfolio enhancement failed after ${totalTime}ms:`, error);
		throw error;
	}
}

// MODIFY your existing enhancedHoldingComplete() function in holdingsService.ts
// Add the income calculation after HDO/FMP processing

async function enhancedHoldingComplete(
	userHolding,
	userId: string,
	portfolioId: string,
	hdoData = null,
	usedBatchSystem = false
) {
	const startTime = Date.now();

	try {
		console.log(`Enhanced holding: ${userHolding.ticker}`);

		let effectiveHdoData = hdoData;

		// Only fallback if batch system wasn't used at all
		if (!effectiveHdoData && !usedBatchSystem) {
			console.log(
				`🔍 FALLBACK: No batch system used for ${userHolding.ticker}, using original lookup`
			);
			effectiveHdoData = await getHdoNormalizedData(userHolding.ticker);
		}

		let enhancedHolding;

		if (effectiveHdoData) {
			console.log(`✅ Using HDO data for ${userHolding.ticker}`);
			enhancedHolding = await mergeHoldingWithHdoData(userHolding, effectiveHdoData);
		} else {
			console.log(`📊 Using FMP enhancement for ${userHolding.ticker}`);
			enhancedHolding = await mergeHoldingWithFmpData(userHolding);
		}

		const totalTime = Date.now() - startTime;
		console.log(`⏱️ Total: ${userHolding.ticker} = ${totalTime}ms`);

		return enhancedHolding;
	} catch (error) {
		// ... existing error handling
	}
}
// Surgical fix for mergeHoldingWithHdoData() function
// Replace the existing function in your holdingsService.ts

async function mergeHoldingWithHdoData(userHolding, hdoData) {
	console.log(
		`🔍 mergeHoldingWithHdoData called for ${userHolding.ticker} with hdoData.category: ${hdoData?.category}`
	);

	try {
		console.log(`🔍 HDO Debug for ${userHolding.ticker}:`, {
			category: hdoData.category,
			hdoSector: hdoData.hdoSector,
			hdo_sector: hdoData.hdo_sector,
			allHdoFields: Object.keys(hdoData).filter((key) => key.includes('sector'))
		});

		// Get COMPLETE record from holding table
		const dbHolding = await db
			.select()
			.from(holding)
			.where(eq(holding.ticker, userHolding.ticker.toUpperCase()))
			.limit(1);

		// 🎯 SURGICAL FIX: If no holding table data, extract fresh dividend data
		// using the proven logic from 4 days ago
		let dividendData = {
			exDivDate: null,
			payoutDate: null,
			quarterlyAmount: null,
			monthlyAmount: null,
			annualAmount: null,
			dividendFrequency: 'Unknown'
		};

		if (dbHolding.length > 0) {
			// ✅ Use existing normalized data from holding table (overnight refresh worked)
			dividendData = {
				exDivDate: dbHolding[0].exDivDate,
				payoutDate: dbHolding[0].payoutDate,
				quarterlyAmount: dbHolding[0].quarterlyAmount,
				monthlyAmount: dbHolding[0].monthlyAmount,
				annualAmount: dbHolding[0].annualAmount,
				dividendFrequency: dbHolding[0].dividendFrequency
			};
			console.log(`✅ Using existing dividend data from holding table for ${userHolding.ticker}`);
		} else {
			// 🔧 SURGICAL FIX: Extract fresh dividend data using proven functions from working version
			console.log(
				`🔄 No holding table data found, extracting fresh dividend data for ${userHolding.ticker}`
			);

			// Use the exact same logic that worked 4 days ago
			const dates = await normalizeHdoDates(hdoData);
			const amounts = await getHdoDividendAmounts(hdoData);
			const divDatesData = await getPureDivDatesData(hdoData.ticker);

			const divFreq = hdoData.divFreq || amounts.frequency;
			let quarterlyAmount = null;
			let monthlyAmount = null;

			console.log(
				`🔍 NNN Debug - Category: "${hdoData.category}", divFreq: "${divFreq}", divDatesAmount: ${divDatesData?.amount}`
			);

			if (hdoData.category === 'core1' || hdoData.category === 'core2') {
				// Use pure div_dates amount for core holdings
				quarterlyAmount =
					(divFreq === 'Q' || divFreq?.startsWith('Q ')) && divDatesData?.amount
						? divDatesData.amount.toString()
						: null;
				monthlyAmount =
					divFreq === 'M' && divDatesData?.amount ? divDatesData.amount.toString() : null;
			} else {
				// Calculate for cons1/cons2/cons3 from annual amount
				const annualAmount = amounts.annualAmount || 0;
				if (divFreq === 'Q' || divFreq?.startsWith('Q ')) {
					quarterlyAmount = annualAmount > 0 ? (annualAmount / 4).toString() : null;
				} else if (divFreq === 'M') {
					monthlyAmount = annualAmount > 0 ? (annualAmount / 12).toString() : null;
				}
			}

			dividendData = {
				exDivDate: dates.exDivDate,
				payoutDate: dates.payoutDate,
				quarterlyAmount,
				monthlyAmount,
				annualAmount: amounts.annualAmount.toString(),
				dividendFrequency: amounts.frequency
			};

			console.log(`✅ Extracted fresh dividend data for ${userHolding.ticker}:`, {
				exDivDate: dividendData.exDivDate,
				payoutDate: dividendData.payoutDate,
				frequency: dividendData.dividendFrequency
			});
		}

		const actualHdoSector = dbHolding.length > 0 ? dbHolding[0].hdoSector : null;

		// Handle holdToSell frequency from FMP if needed
		let effectiveFrequency = dividendData.dividendFrequency;
		if (hdoData.category === 'holdToSell') {
			console.log(
				`🔍 holdToSell ${userHolding.ticker}: Getting frequency from FMP (permanent backfill)`
			);

			try {
				const fmpFrequency = await getFmpDividendFrequency(userHolding.ticker);
				if (fmpFrequency && fmpFrequency !== 'Unknown') {
					effectiveFrequency = fmpFrequency;
					console.log(`✅ FMP frequency for holdToSell ${userHolding.ticker}: ${fmpFrequency}`);

					// Calculate period amounts from HDO annual amount + FMP frequency
					const annualAmount = parseFloat(dividendData.annualAmount || '0');
					if (annualAmount > 0) {
						if (fmpFrequency === 'Q') {
							dividendData.quarterlyAmount = (annualAmount / 4).toString();
							console.log(
								`📊 Calculated quarterly for ${userHolding.ticker}: $${dividendData.quarterlyAmount}`
							);
						} else if (fmpFrequency === 'M') {
							dividendData.monthlyAmount = (annualAmount / 12).toString();
							console.log(
								`📊 Calculated monthly for ${userHolding.ticker}: $${dividendData.monthlyAmount}`
							);
						}
					}
				} else {
					console.warn(`⚠️ Could not get FMP frequency for holdToSell ${userHolding.ticker}`);
				}
			} catch (error) {
				console.error(`❌ FMP frequency fetch failed for holdToSell ${userHolding.ticker}:`, error);
			}
		}

		return {
			...userHolding,
			name: hdoData.displayName || hdoData.stockName || hdoData.bondName || userHolding.name,
			dividendYield: hdoData.divYield || hdoData.currentYield || 0,
			dividendFrequency: effectiveFrequency,
			// HDO category and sector info
			hdoCategory: hdoData.category,
			hdoSector: actualHdoSector,
			category: getHdoDisplayCategory(hdoData),
			// HDO-specific fields
			hdoRisk: hdoData.risk,
			hdoNotes: hdoData.generalNotes,
			hdoDividendNotes: hdoData.dividendNotes,
			buyUnderPrice: hdoData.buyUnderPrice || hdoData.buyUnder,
			buyUnderText: hdoData.buyUnderText,
			// Payment schedule for preferred stocks
			paymentSchedule:
				hdoData.dividendPayDateText && hdoData.dividendPayDateValue
					? `${hdoData.dividendPayDateText} ${hdoData.dividendPayDateValue}`.trim()
					: '',
			// ONLY live_price can override HDO data
			currentPrice: parseFloat(userHolding.livePrice) || 0,
			originalAnnualAmount: dividendData.annualAmount,
			annualAmount: userHolding.hasUserOverride
				? userHolding.dividendOverride
				: dividendData.annualAmount,
			quarterlyAmount: userHolding.hasUserOverride
				? (parseFloat(userHolding.dividendOverride) / 4).toString()
				: dividendData.quarterlyAmount,
			monthlyAmount: dividendData.monthlyAmount,
			semiAnnualAmount:
				hdoData.category === 'cons3' && dividendData.annualAmount
					? (parseFloat(dividendData.annualAmount) / 2).toString()
					: null,
			periodAmount:
				hdoData.category === 'cons3'
					? (parseFloat(hdoData.coupon || 0) / 2).toString()
					: dividendData.quarterlyAmount || dividendData.monthlyAmount,
			// 🎯 SURGICAL FIX: Use extracted dividend data
			exDivDate: dividendData.exDivDate,
			payoutDate: dividendData.payoutDate,
			// Other fields from holding table if available
			issuesK1: dbHolding[0]?.issuesK1,
			earningsDate: dbHolding[0]?.earningsDate,
			timing: dbHolding[0]?.timing,
			dividendStatus: dbHolding[0]?.dividendStatus,
			performance1D: dbHolding[0]?.performance1D,
			performance1M: dbHolding[0]?.performance1M,
			performanceYTD: dbHolding[0]?.performanceYTD,
			performance1Y: dbHolding[0]?.performance1Y,
			performance1D_adj: dbHolding[0]?.performance1D_adj,
			performance1M_adj: dbHolding[0]?.performance1M_adj,
			performanceYTD_adj: dbHolding[0]?.performanceYTD_adj,
			performance1Y_adj: dbHolding[0]?.performance1Y_adj,
			// Mark as HDO source
			source: 'hdo'
		};
	} catch (error) {
		console.error(`error merging HDO data for ${userHolding.ticker}:`, error);
		throw error;
	}
}

async function getFmpDividendFrequency(ticker: string): Promise<string | null> {
	try {
		console.log(`🔍 Starting FMP frequency lookup for ${ticker}`);

		const { convertHdoToFmpTicker } = await import('./priceService');
		const fmpTicker = convertHdoToFmpTicker(ticker);

		console.log(`🔄 Converted ${ticker} → ${fmpTicker} for FMP API`);

		const apiUrl = `https://financialmodelingprep.com/stable/dividends?symbol=${fmpTicker}&apikey=${FMP_API_KEY}`;
		console.log(`📡 FMP API URL: ${apiUrl.replace(FMP_API_KEY, 'API_KEY_HIDDEN')}`);

		const response = await fetch(apiUrl);
		console.log(`📊 FMP Response status: ${response.status}`);

		const dividends = await response.json();
		console.log(`📋 FMP Response data:`, dividends?.slice(0, 3)); // Just first 3 records

		if (dividends && dividends.length > 0) {
			const mostRecent = dividends[0];
			console.log(`🎯 Most recent dividend:`, mostRecent);

			const normalizedFreq = normalizeFrequency(mostRecent.frequency);
			console.log(`✅ Normalized frequency: ${normalizedFreq}`);

			return normalizedFreq;
		} else {
			console.log(`⚠️ No dividend data returned for ${ticker}`);
		}

		return null;
	} catch (error) {
		console.error(`❌ Error getting FMP frequency for ${ticker}:`, error);
		return null;
	}
}

async function mergeHoldingWithFmpData(userHolding) {
	try {
		console.log(`merging FMP data for ${userHolding.ticker}`);
		const normalizedHolding = await db
			.select()
			.from(holding)
			.where(eq(holding.ticker, userHolding.ticker.toUpperCase()))
			.limit(1);

		if (normalizedHolding.length > 0) {
			// Use existing normalized data from database
			const dbHolding = normalizedHolding[0];
			return {
				...userHolding, // Keep user's quantity, averageCost, etc.
				// Use normalized data from holding table
				name: dbHolding.name || userHolding.name,
				dividendYield: parseFloat(dbHolding.dividendYield) || 0,
				dividendFrequency: dbHolding.dividendFrequency || 'Unknown',
				category: dbHolding.category || 'Market',
				sector: dbHolding.sector,
				industry: dbHolding.industry,
				// Always use live_price (most current)
				currentPrice: parseFloat(userHolding.livePrice) || 0,

				annualAmount: userHolding.hasUserOverride
					? userHolding.dividendOverride
					: userHolding.annualAmount,
				quarterlyAmount: userHolding.hasUserOverride
					? (parseFloat(userHolding.dividendOverride) / 4).toString()
					: dbHolding.quarterlyAmount,
				monthlyAmount: dbHolding.monthlyAmount,
				irregularAmount: dbHolding.irregularAmount,
				exDivDate: dbHolding.exDivDate,
				payoutDate: dbHolding.payoutDate,
				recordDate: dbHolding.recordDate,
				performance1D: dbHolding.performance1D,
				performance1M: dbHolding.performance1M,
				performanceYTD: dbHolding.performanceYTD,
				performance1Y: dbHolding.performance1Y,
				performance1D_adj: dbHolding.performance1D_adj,
				performance1M_adj: dbHolding.performance1M_adj,
				performanceYTD_adj: dbHolding.performanceYTD_adj,
				performance1Y_adj: dbHolding.performance1Y_adj,
				source: dbHolding.source || 'fmp'
			};
		}
		return {
			...userHolding,
			currentPrice: parseFloat(userHolding.livePrice) || parseFloat(userHolding.averageCost) || 0,
			dividendYield: 0,
			source: 'fmp-basic'
		};
	} catch (error) {
		console.error(`Error merging FMP data for ${userHolding.ticker}:`, error);
		throw error;
	}
}

function getHdoDisplayCategory(hdoData) {
	if (hdoData.description) {
		return hdoData.description; // core1/core2: "Energy Infrastructure", "REIT", etc.
	}

	// Specific categories for bond/preferred tables
	switch (hdoData.category) {
		case 'cons1':
			return 'Preferred Stock';
		case 'cons2':
			return 'Baby Bond';
		case 'cons3':
			return 'Traditional Bond';
		case 'core1':
			return 'Core Dividend';
		case 'core2':
			return 'Core Income';
		case 'holdToSell':
			return 'Hold to Sell';
		default:
			return 'HDO Holding';
	}
}

export async function setDividendOverride(
	userId: string,
	portfolioId: string,
	ticker: string,
	overrideAmount: number
) {
	try {
		console.log(`setting dividend override for ${ticker}: $${overrideAmount}`);

		const result = await db
			.update(holdings)
			.set({
				dividendOverride: overrideAmount.toString(),
				hasUserOverride: true,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(holdings.userId, userId),
					eq(holdings.portfolioId, portfolioId),
					eq(holdings.ticker, ticker.toUpperCase())
				)
			)
			.returning();

		if (result.length === 0) {
			throw new Error(`no holding found for ${ticker} in this portfolio`);
		}
		console.log(`dividend override set successfully for ${ticker}`);
		return result[0];
	} catch (error) {
		console.error(`Error setting dividend override for ${ticker}:`, error);
		throw error;
	}
}

export async function getDividendOverrides(userId: string, portfolioId: string) {
	try {
		const overrides = await db
			.select({
				id: holdings.id,
				ticker: holdings.ticker,
				name: holdings.name,
				dividendOverride: holdings.dividendOverride,
				hasUserOverride: holdings.hasUserOverride,
				// Get original dividend info from holding table
				originalAnnualAmount: holding.annualAmount,
				dividendFrequency: holding.dividendFrequency,
				exDivDate: holding.exDivDate
			})
			.from(holdings)
			.leftJoin(holding, eq(holdings.ticker, holding.ticker))
			.where(
				and(
					eq(holdings.userId, userId),
					eq(holdings.portfolioId, portfolioId),
					eq(holdings.hasUserOverride, true)
				)
			);
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Start of today

		const sorted = overrides.sort((a, b) => {
			const dateA = a.exDivDate ? new Date(a.exDivDate) : null;
			const dateB = b.exDivDate ? new Date(b.exDivDate) : null;

			// Handle null dates (put at end)
			if (!dateA && !dateB) return 0;
			if (!dateA) return 1;
			if (!dateB) return -1;

			const isFutureA = dateA >= today;
			const isFutureB = dateB >= today;

			// Future dates first
			if (isFutureA && !isFutureB) return -1;
			if (!isFutureA && isFutureB) return 1;

			// Within same group (both future or both past), sort by date
			return dateA.getTime() - dateB.getTime();
		});

		return sorted;
	} catch (error) {
		console.error('Error fetching dividend overrides:', error);
		throw error;
	}
}

/**
 * Remove dividend override for a user's holding
 */
export async function removeDividendOverride(
	userId: string,
	portfolioId: string,
	holdingId: string
) {
	try {
		console.log(`Removing dividend override for holding: ${holdingId}`);

		const result = await db
			.update(holdings)
			.set({
				dividendOverride: null,
				hasUserOverride: false,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(holdings.userId, userId),
					eq(holdings.portfolioId, portfolioId),
					eq(holdings.id, holdingId)
				)
			)
			.returning();

		if (result.length === 0) {
			throw new Error('No holding found to remove override from');
		}

		console.log(`Dividend override removed successfully`);
		return result[0];
	} catch (error) {
		console.error(`Error removing dividend override:`, error);
		throw error;
	}
}

export async function updateHoldingQuantity(
	userId: string,
	portfolioId: string,
	ticker: string,
	newQuantity: number
) {
	try {
		// First, get the current holding to calculate new average cost
		const currentHolding = await db
			.select()
			.from(holdings)
			.where(
				and(
					eq(holdings.userId, userId),
					eq(holdings.portfolioId, portfolioId),
					eq(holdings.ticker, ticker.toUpperCase())
				)
			)
			.limit(1);

		if (currentHolding.length === 0) {
			throw new Error(`No holding found for ${ticker}`);
		}

		const holding = currentHolding[0];
		const currentQuantity = parseFloat(holding.quantity.toString());
		const currentAverageCost = parseFloat(holding.averageCost?.toString() || '0');

		// Calculate new average cost based on split ratio
		const splitRatio = currentQuantity / newQuantity;
		const newAverageCost = currentAverageCost * splitRatio;

		// Update the holding
		const result = await db
			.update(holdings)
			.set({
				quantity: newQuantity.toString(),
				averageCost: newAverageCost.toString(),
				updatedAt: new Date()
			})
			.where(eq(holdings.id, holding.id))
			.returning();

		return result[0];
	} catch (error) {
		console.error('Error updating holding quantity:', error);
		throw error;
	}
}
function parseFmpDate(dateString: string): Date | null {
	if (!dateString) return null;

	// Handle FMP ISO date format: "2024-06-29" or "2024-06-29T00:00:00"
	const dateOnly = dateString.split('T')[0];
	const [year, month, day] = dateOnly.split('-');

	// Create local date (avoiding UTC timezone issues)
	let date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

	// Apply your existing weekend adjustment for business logic consistency
	return adjustForWeekends(date);
}

// ✅ ADD: New fast HDO lookup function (self-contained, easy to delete)

// ✅ NEW: Batch HDO lookup function (easy to delete if needed)
async function getBatchHdoData(tickers: string[]) {
	const startTime = Date.now();

	try {
		console.log(`🚀 BATCH TEST: Looking up ${tickers.length} tickers in one query`);
		console.log(`📋 BATCH TEST: Tickers = ${tickers.join(', ')}`);

		const hdoRecords = await db
			.select()
			.from(holding)
			.where(
				and(
					eq(holding.source, 'hdo'),
					inArray(
						holding.ticker,
						tickers.map((t) => t.toUpperCase())
					)
				)
			);

		const queryTime = Date.now() - startTime;
		console.log(`⚡ BATCH TEST: Found ${hdoRecords.length} HDO holdings in ${queryTime}ms`);

		// FIX: Map hdoCategory to category for compatibility
		const mappedRecords = hdoRecords.map((record) => ({
			...record,
			category: record.hdoCategory // ADD THIS LINE
		}));

		// Log what we found
		mappedRecords.forEach((record) => {
			console.log(`  📊 Found HDO: ${record.ticker} (${record.hdoCategory})`);
		});

		return mappedRecords; // Return mapped records instead of hdoRecords
	} catch (error) {
		console.error(`❌ BATCH TEST: Batch lookup failed:`, error);
		return [];
	}
}
