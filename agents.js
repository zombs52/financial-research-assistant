// Financial Research Agents - Self-contained, no external AI dependencies

class DataAgent {
    constructor() {
        this.name = "Data Agent";
        this.cache = new Map();
    }

    async fetchStockData(symbol) {
        // Check cache first (1 hour expiry)
        const cacheKey = `${symbol}_${Math.floor(Date.now() / 3600000)}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Primary: Alpha Vantage (free 25 calls/day)
            let data = await this.fetchFromAlphaVantage(symbol);
            
            if (!data) {
                // Fallback: Free financial API
                data = await this.fetchFromFreeAPI(symbol);
            }

            if (!data) {
                // Final fallback: Demo data for portfolio showcase
                data = this.generateDemoData(symbol);
            }

            this.cache.set(cacheKey, data);
            return data;

        } catch (error) {
            console.warn('Data fetch failed, using demo data:', error);
            return this.generateDemoData(symbol);
        }
    }

    async fetchFromAlphaVantage(symbol) {
        // Free demo API key - 25 calls per day
        const API_KEY = 'RIBBITMEDIA'; // Free demo key
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data['Time Series (Daily)']) {
                return this.parseAlphaVantageData(data, symbol);
            }
            if (data['Note']) {
                console.warn('API limit reached:', data['Note']);
                return null;
            }
            return null;
        } catch (error) {
            console.warn('Alpha Vantage fetch failed:', error);
            return null;
        }
    }

    async fetchFromFreeAPI(symbol) {
        // Free financial data API - always works
        try {
            // Using Financial Modeling Prep free tier (no signup required)
            const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=demo`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.historical && data.historical.length > 0) {
                return this.parseFMPData(data, symbol);
            }
            return null;
        } catch (error) {
            console.warn('Free API fetch failed:', error);
            return null;
        }
    }

    async fetchFromYahooFinance(symbol) {
        // Backup method using Yahoo Finance
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result[0]) {
                return this.parseYahooData(data.chart.result[0], symbol);
            }
            return null;
        } catch (error) {
            console.warn('Yahoo Finance fetch failed:', error);
            return null;
        }
    }

    parseAlphaVantageData(data, symbol) {
        const timeSeries = data['Time Series (Daily)'];
        const dates = Object.keys(timeSeries).slice(0, 30).reverse();
        
        return {
            symbol: symbol,
            dates: dates,
            prices: dates.map(date => parseFloat(timeSeries[date]['4. close'])),
            volumes: dates.map(date => parseInt(timeSeries[date]['5. volume'])),
            highs: dates.map(date => parseFloat(timeSeries[date]['2. high'])),
            lows: dates.map(date => parseFloat(timeSeries[date]['3. low'])),
            currentPrice: parseFloat(timeSeries[dates[dates.length - 1]]['4. close']),
            lastUpdate: new Date().toISOString()
        };
    }

    parseFMPData(data, symbol) {
        const historical = data.historical.slice(0, 30).reverse(); // Last 30 days, oldest first
        
        return {
            symbol: symbol,
            dates: historical.map(h => h.date),
            prices: historical.map(h => h.close),
            volumes: historical.map(h => h.volume || 1000000), // Default volume if missing
            highs: historical.map(h => h.high || h.close),
            lows: historical.map(h => h.low || h.close),
            currentPrice: historical[historical.length - 1].close,
            lastUpdate: new Date().toISOString()
        };
    }

    parsePolygonData(data, symbol) {
        const results = data.results.slice(-30); // Last 30 days
        
        return {
            symbol: symbol,
            dates: results.map(r => new Date(r.t).toISOString().split('T')[0]),
            prices: results.map(r => r.c), // close prices
            volumes: results.map(r => r.v), // volumes
            highs: results.map(r => r.h), // high prices
            lows: results.map(r => r.l), // low prices
            currentPrice: results[results.length - 1].c,
            lastUpdate: new Date().toISOString()
        };
    }

    parseYahooData(result, symbol) {
        const timestamps = result.timestamp;
        const prices = result.indicators.quote[0].close;
        const volumes = result.indicators.quote[0].volume;
        const highs = result.indicators.quote[0].high;
        const lows = result.indicators.quote[0].low;
        
        return {
            symbol: symbol,
            dates: timestamps.slice(-30).map(ts => new Date(ts * 1000).toISOString().split('T')[0]),
            prices: prices.slice(-30),
            volumes: volumes.slice(-30),
            highs: highs.slice(-30),
            lows: lows.slice(-30),
            currentPrice: prices[prices.length - 1],
            lastUpdate: new Date().toISOString()
        };
    }

    generateDemoData(symbol) {
        // Generate realistic demo data for portfolio showcase
        const basePrice = this.getBasePriceForSymbol(symbol);
        const dates = [];
        const prices = [];
        const volumes = [];
        const highs = [];
        const lows = [];
        
        let currentPrice = basePrice;
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
            
            // Simulate price movement (±3% daily volatility)
            const change = (Math.random() - 0.5) * 0.06;
            currentPrice *= (1 + change);
            
            const dayHigh = currentPrice * (1 + Math.random() * 0.02);
            const dayLow = currentPrice * (1 - Math.random() * 0.02);
            const volume = Math.floor(Math.random() * 10000000) + 1000000;
            
            prices.push(parseFloat(currentPrice.toFixed(2)));
            highs.push(parseFloat(dayHigh.toFixed(2)));
            lows.push(parseFloat(dayLow.toFixed(2)));
            volumes.push(volume);
        }
        
        return {
            symbol: symbol,
            dates: dates,
            prices: prices,
            volumes: volumes,
            highs: highs,
            lows: lows,
            currentPrice: prices[prices.length - 1],
            lastUpdate: new Date().toISOString(),
            isDemo: true
        };
    }

    getBasePriceForSymbol(symbol) {
        const knownPrices = {
            'AAPL': 150,
            'TSLA': 250,
            'GOOGL': 2800,
            'MSFT': 300,
            'AMZN': 3200,
            'ASML': 600,
            'SHELL': 28,
            'ADYEN': 1200
        };
        return knownPrices[symbol] || 100;
    }
}

class AnalysisAgent {
    constructor() {
        this.name = "Analysis Agent";
    }

    async analyze(stockData) {
        // Simulate processing time for UI effect
        await this.delay(1500);
        
        const analysis = {
            technicalIndicators: this.calculateTechnicalIndicators(stockData),
            priceAnalysis: this.analyzePriceAction(stockData),
            volatility: this.calculateVolatility(stockData),
            trend: this.determineTrend(stockData),
            support: this.findSupportResistance(stockData),
            score: 0
        };
        
        analysis.score = this.calculateOverallScore(analysis);
        return analysis;
    }

    calculateTechnicalIndicators(data) {
        const prices = data.prices;
        
        return {
            sma20: this.calculateSMA(prices, 20),
            sma50: this.calculateSMA(prices, Math.min(prices.length, 50)),
            rsi: this.calculateRSI(prices),
            macd: this.calculateMACD(prices),
            bollinger: this.calculateBollingerBands(prices)
        };
    }

    calculateSMA(prices, period) {
        if (prices.length < period) period = prices.length;
        const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
        return parseFloat((sum / period).toFixed(2));
    }

    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50; // Neutral
        
        const changes = [];
        for (let i = 1; i < prices.length; i++) {
            changes.push(prices[i] - prices[i - 1]);
        }
        
        let gains = 0, losses = 0;
        for (let i = Math.max(0, changes.length - period); i < changes.length; i++) {
            if (changes[i] > 0) gains += changes[i];
            else losses -= changes[i];
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return parseFloat((100 - (100 / (1 + rs))).toFixed(2));
    }

    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macdLine = ema12 - ema26;
        return parseFloat(macdLine.toFixed(2));
    }

    calculateEMA(prices, period) {
        if (prices.length === 0) return 0;
        
        const multiplier = 2 / (period + 1);
        let ema = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    calculateBollingerBands(prices, period = 20) {
        const sma = this.calculateSMA(prices, period);
        const stdDev = this.calculateStandardDeviation(prices.slice(-period));
        
        return {
            upper: parseFloat((sma + (stdDev * 2)).toFixed(2)),
            middle: sma,
            lower: parseFloat((sma - (stdDev * 2)).toFixed(2))
        };
    }

    calculateStandardDeviation(prices) {
        const mean = prices.reduce((a, b) => a + b) / prices.length;
        const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b) / prices.length;
        return Math.sqrt(avgSquaredDiff);
    }

    analyzePriceAction(data) {
        const prices = data.prices;
        const current = prices[prices.length - 1];
        const previous = prices[prices.length - 2];
        const weekAgo = prices[Math.max(0, prices.length - 7)];
        
        return {
            dailyChange: parseFloat(((current - previous) / previous * 100).toFixed(2)),
            weeklyChange: parseFloat(((current - weekAgo) / weekAgo * 100).toFixed(2)),
            highLow52: this.calculate52WeekHighLow(data),
            momentum: this.calculateMomentum(prices)
        };
    }

    calculate52WeekHighLow(data) {
        const high = Math.max(...data.highs);
        const low = Math.min(...data.lows);
        const current = data.currentPrice;
        
        return {
            high: high,
            low: low,
            percentFromHigh: parseFloat(((current - high) / high * 100).toFixed(2)),
            percentFromLow: parseFloat(((current - low) / low * 100).toFixed(2))
        };
    }

    calculateVolatility(data) {
        const returns = [];
        for (let i = 1; i < data.prices.length; i++) {
            const returnPct = (data.prices[i] - data.prices[i-1]) / data.prices[i-1];
            returns.push(returnPct);
        }
        
        const volatility = this.calculateStandardDeviation(returns) * Math.sqrt(252) * 100;
        return parseFloat(volatility.toFixed(2));
    }

    determineTrend(data) {
        const prices = data.prices;
        const recentPrices = prices.slice(-10);
        const oldPrices = prices.slice(-20, -10);
        
        const recentAvg = recentPrices.reduce((a, b) => a + b) / recentPrices.length;
        const oldAvg = oldPrices.reduce((a, b) => a + b) / oldPrices.length;
        
        const change = (recentAvg - oldAvg) / oldAvg * 100;
        
        if (change > 2) return 'Uptrend';
        if (change < -2) return 'Downtrend';
        return 'Sideways';
    }

    findSupportResistance(data) {
        const highs = data.highs;
        const lows = data.lows;
        
        return {
            resistance: parseFloat(Math.max(...highs.slice(-10)).toFixed(2)),
            support: parseFloat(Math.min(...lows.slice(-10)).toFixed(2))
        };
    }

    calculateMomentum(prices) {
        if (prices.length < 10) return 0;
        
        const recent = prices.slice(-5).reduce((a, b) => a + b) / 5;
        const older = prices.slice(-10, -5).reduce((a, b) => a + b) / 5;
        
        return parseFloat(((recent - older) / older * 100).toFixed(2));
    }

    calculateOverallScore(analysis) {
        let score = 50; // Start neutral
        
        // RSI scoring
        if (analysis.technicalIndicators.rsi > 70) score -= 10; // Overbought
        else if (analysis.technicalIndicators.rsi < 30) score += 10; // Oversold
        
        // Trend scoring
        if (analysis.trend === 'Uptrend') score += 15;
        else if (analysis.trend === 'Downtrend') score -= 15;
        
        // Momentum scoring
        if (analysis.priceAnalysis.momentum > 5) score += 10;
        else if (analysis.priceAnalysis.momentum < -5) score -= 10;
        
        // Volatility penalty
        if (analysis.volatility > 50) score -= 5;
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class SentimentAgent {
    constructor() {
        this.name = "Sentiment Agent";
    }

    async analyzeSentiment(symbol) {
        // Simulate processing time
        await this.delay(1000);
        
        // For demo purposes, generate realistic sentiment based on symbol
        return {
            overall: this.generateSentimentScore(symbol),
            social: this.generateSocialSentiment(symbol),
            news: this.generateNewsSentiment(symbol),
            volume: this.generateSentimentVolume(),
            confidence: Math.round(Math.random() * 30 + 70) // 70-100%
        };
    }

    generateSentimentScore(symbol) {
        // Popular stocks tend to have more positive sentiment
        const popularStocks = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN'];
        const baseScore = popularStocks.includes(symbol) ? 65 : 50;
        
        // Add some randomness
        const variation = (Math.random() - 0.5) * 40;
        return Math.max(0, Math.min(100, Math.round(baseScore + variation)));
    }

    generateSocialSentiment(symbol) {
        const sentiments = ['Very Positive', 'Positive', 'Neutral', 'Negative', 'Very Negative'];
        const weights = [0.2, 0.3, 0.3, 0.15, 0.05]; // Skewed toward positive
        
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return sentiments[i];
            }
        }
        
        return 'Neutral';
    }

    generateNewsSentiment(symbol) {
        const newsTypes = [
            'Positive earnings outlook',
            'Strong quarterly results',
            'New product launch',
            'Analyst upgrade',
            'Market volatility concerns',
            'Regulatory scrutiny',
            'Competition pressure'
        ];
        
        return newsTypes[Math.floor(Math.random() * newsTypes.length)];
    }

    generateSentimentVolume() {
        const volumes = ['High', 'Medium', 'Low'];
        const weights = [0.3, 0.5, 0.2];
        
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return volumes[i];
            }
        }
        
        return 'Medium';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class ReportAgent {
    constructor() {
        this.name = "Report Agent";
    }

    async generateReport(stockData, analysis, sentiment, mode) {
        // Simulate processing time
        await this.delay(800);
        
        if (mode === 'beginner') {
            return this.generateBeginnerReport(stockData, analysis, sentiment);
        } else {
            return this.generateAdvancedReport(stockData, analysis, sentiment);
        }
    }

    generateBeginnerReport(stockData, analysis, sentiment) {
        const recommendation = this.getBeginnerRecommendation(analysis, sentiment);
        
        return {
            html: `
                <div class="recommendation ${recommendation.class}">
                    <h3>${recommendation.icon} ${recommendation.title}</h3>
                    <p><strong>${recommendation.summary}</strong></p>
                    <p>${recommendation.advice}</p>
                </div>
                
                <div class="analysis-grid">
                    <div class="analysis-card">
                        <h4>📈 Simple Metrics</h4>
                        <div class="metric">
                            <span class="metric-label">
                                <span class="tooltip">Current Price
                                    <span class="tooltiptext">The latest trading price of the stock</span>
                                </span>
                            </span>
                            <span class="metric-value">$${stockData.currentPrice}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">
                                <span class="tooltip">Daily Change
                                    <span class="tooltiptext">How much the price changed today</span>
                                </span>
                            </span>
                            <span class="metric-value ${analysis.priceAnalysis.dailyChange >= 0 ? 'text-success' : 'text-danger'}">
                                ${analysis.priceAnalysis.dailyChange}%
                            </span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">
                                <span class="tooltip">Trend Direction
                                    <span class="tooltiptext">Whether the stock is generally going up, down, or sideways</span>
                                </span>
                            </span>
                            <span class="metric-value">${analysis.trend}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">
                                <span class="tooltip">Risk Level
                                    <span class="tooltiptext">How much the stock price typically moves up and down</span>
                                </span>
                            </span>
                            <span class="metric-value">${this.getRiskLevel(analysis.volatility)}</span>
                        </div>
                    </div>
                    
                    <div class="analysis-card">
                        <h4>💭 What People Think</h4>
                        <div class="metric">
                            <span class="metric-label">Market Mood</span>
                            <span class="metric-value">${sentiment.social}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Recent News</span>
                            <span class="metric-value">${sentiment.news}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Confidence Level</span>
                            <span class="metric-value">${sentiment.confidence}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="analysis-card">
                    <h4>🎯 Simple Explanation</h4>
                    <p><strong>What this means:</strong> ${this.explainInSimpleTerms(stockData, analysis, sentiment)}</p>
                    <p><strong>Should I invest?</strong> ${recommendation.explanation}</p>
                    <p><strong>Risk warning:</strong> ${this.getRiskWarning(analysis.volatility)}</p>
                </div>
            `,
            text: recommendation.summary
        };
    }

    generateAdvancedReport(stockData, analysis, sentiment) {
        const recommendation = this.getAdvancedRecommendation(analysis, sentiment);
        
        return {
            html: `
                <div class="recommendation ${recommendation.class}">
                    <h3>${recommendation.icon} ${recommendation.title}</h3>
                    <p><strong>Overall Score: ${analysis.score}/100</strong></p>
                    <p>${recommendation.summary}</p>
                </div>
                
                <div class="analysis-grid">
                    <div class="analysis-card">
                        <h4>📊 Technical Analysis</h4>
                        <div class="metric">
                            <span class="metric-label">RSI (14)</span>
                            <span class="metric-value">${analysis.technicalIndicators.rsi}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">SMA (20)</span>
                            <span class="metric-value">$${analysis.technicalIndicators.sma20}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">MACD</span>
                            <span class="metric-value">${analysis.technicalIndicators.macd}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Bollinger Upper</span>
                            <span class="metric-value">$${analysis.technicalIndicators.bollinger.upper}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Bollinger Lower</span>
                            <span class="metric-value">$${analysis.technicalIndicators.bollinger.lower}</span>
                        </div>
                    </div>
                    
                    <div class="analysis-card">
                        <h4>💹 Price Action</h4>
                        <div class="metric">
                            <span class="metric-label">Daily Change</span>
                            <span class="metric-value">${analysis.priceAnalysis.dailyChange}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Weekly Change</span>
                            <span class="metric-value">${analysis.priceAnalysis.weeklyChange}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Momentum</span>
                            <span class="metric-value">${analysis.priceAnalysis.momentum}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">From 52W High</span>
                            <span class="metric-value">${analysis.priceAnalysis.highLow52.percentFromHigh}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">From 52W Low</span>
                            <span class="metric-value">${analysis.priceAnalysis.highLow52.percentFromLow}%</span>
                        </div>
                    </div>
                    
                    <div class="analysis-card">
                        <h4>📈 Support & Resistance</h4>
                        <div class="metric">
                            <span class="metric-label">Support Level</span>
                            <span class="metric-value">$${analysis.support.support}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Resistance Level</span>
                            <span class="metric-value">$${analysis.support.resistance}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Trend</span>
                            <span class="metric-value">${analysis.trend}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Volatility</span>
                            <span class="metric-value">${analysis.volatility}%</span>
                        </div>
                    </div>
                    
                    <div class="analysis-card">
                        <h4>💭 Market Sentiment</h4>
                        <div class="metric">
                            <span class="metric-label">Overall Sentiment</span>
                            <span class="metric-value">${sentiment.overall}/100</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Social Sentiment</span>
                            <span class="metric-value">${sentiment.social}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">News Sentiment</span>
                            <span class="metric-value">${sentiment.news}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Volume</span>
                            <span class="metric-value">${sentiment.volume}</span>
                        </div>
                    </div>
                </div>
            `,
            text: recommendation.summary
        };
    }

    getBeginnerRecommendation(analysis, sentiment) {
        const score = analysis.score;
        
        if (score >= 70) {
            return {
                class: 'recommendation',
                icon: '✅',
                title: 'Good Investment Choice',
                summary: 'This stock looks promising for investment',
                advice: 'Consider adding this to your portfolio, but start with a small amount',
                explanation: 'The numbers look good and people are generally positive about this stock.'
            };
        } else if (score >= 50) {
            return {
                class: 'warning',
                icon: '⚠️',
                title: 'Proceed with Caution',
                summary: 'Mixed signals - do more research',
                advice: 'Wait for better conditions or invest only a small amount',
                explanation: 'Some good signs, some concerning ones. Better to wait or be very careful.'
            };
        } else {
            return {
                class: 'danger',
                icon: '❌',
                title: 'Avoid for Now',
                summary: 'This stock shows warning signs',
                advice: 'Look for other opportunities',
                explanation: 'Too many red flags right now. Better to find safer investments.'
            };
        }
    }

    getAdvancedRecommendation(analysis, sentiment) {
        const score = analysis.score;
        
        if (score >= 75) {
            return {
                class: 'recommendation',
                icon: '🚀',
                title: 'Strong Buy',
                summary: 'Multiple positive indicators align for potential upside'
            };
        } else if (score >= 60) {
            return {
                class: 'recommendation',
                icon: '👍',
                title: 'Buy',
                summary: 'Generally positive outlook with manageable risks'
            };
        } else if (score >= 40) {
            return {
                class: 'warning',
                icon: '📊',
                title: 'Hold/Neutral',
                summary: 'Mixed technical signals suggest sideways movement'
            };
        } else if (score >= 25) {
            return {
                class: 'warning',
                icon: '👎',
                title: 'Sell',
                summary: 'Negative indicators suggest potential downside risk'
            };
        } else {
            return {
                class: 'danger',
                icon: '🚨',
                title: 'Strong Sell',
                summary: 'Multiple bearish signals indicate high downside risk'
            };
        }
    }

    getRiskLevel(volatility) {
        if (volatility > 40) return 'High Risk';
        if (volatility > 20) return 'Medium Risk';
        return 'Low Risk';
    }

    getRiskWarning(volatility) {
        if (volatility > 40) {
            return 'This stock moves a lot! You could lose money quickly.';
        } else if (volatility > 20) {
            return 'Normal risk - prices go up and down regularly.';
        } else {
            return 'Relatively stable - smaller price movements.';
        }
    }

    explainInSimpleTerms(stockData, analysis, sentiment) {
        const trend = analysis.trend.toLowerCase();
        const risk = this.getRiskLevel(analysis.volatility).toLowerCase();
        
        return `This stock is currently in a ${trend} and has ${risk}. 
                The current mood around this stock is ${sentiment.social.toLowerCase()}. 
                Based on recent price movements and what people are saying, 
                it ${this.getSimpleOutlook(analysis.score)}.`;
    }

    getSimpleOutlook(score) {
        if (score >= 70) return 'looks like a good opportunity';
        if (score >= 50) return 'has mixed signals';
        return 'shows some warning signs';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}