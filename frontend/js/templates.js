/**
 * Template Library - Pre-designed templates for quick start
 */

const TemplateLibrary = {
    templates: [
        // Amazon Templates
        {
            id: 'amazon-product-1',
            name: 'Amazon Product Showcase',
            category: 'amazon',
            thumbnail: '/templates/amazon-product-1.png',
            size: { width: 1200, height: 628 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    gradient: 'linear-gradient(135deg, #232f3e 0%, #131921 100%)',
                    locked: true
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Headline',
                    text: 'Amazing Deals',
                    x: 80,
                    y: 180,
                    fontSize: 64,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Subheadline',
                    text: 'Up to 50% Off on Select Items',
                    x: 80,
                    y: 260,
                    fontSize: 28,
                    fontWeight: 'normal',
                    color: '#ff9900',
                    fontFamily: 'Inter'
                },
                {
                    id: 'button-1',
                    type: 'button',
                    name: 'CTA Button',
                    text: 'Shop Now',
                    x: 80,
                    y: 320,
                    width: 180,
                    height: 50,
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#131921',
                    backgroundColor: '#ff9900',
                    borderRadius: 4
                }
            ]
        },
        {
            id: 'amazon-deal-1',
            name: 'Amazon Lightning Deal',
            category: 'amazon',
            thumbnail: '/templates/amazon-deal-1.png',
            size: { width: 1080, height: 1080 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    color: '#131921',
                    locked: true
                },
                {
                    id: 'shape-1',
                    type: 'shape',
                    name: 'Accent Shape',
                    shape: 'rectangle',
                    x: 0,
                    y: 0,
                    width: 1080,
                    height: 300,
                    backgroundColor: '#ff9900'
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Deal Badge',
                    text: 'LIGHTNING DEAL',
                    x: 100,
                    y: 150,
                    fontSize: 32,
                    fontWeight: 'bold',
                    color: '#131921',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Discount',
                    text: '60% OFF',
                    x: 100,
                    y: 500,
                    fontSize: 96,
                    fontWeight: 'bold',
                    color: '#ff9900',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-3',
                    type: 'text',
                    name: 'Product Name',
                    text: 'Your Product Name Here',
                    x: 100,
                    y: 600,
                    fontSize: 36,
                    fontWeight: '600',
                    color: '#ffffff',
                    fontFamily: 'Inter'
                },
                {
                    id: 'button-1',
                    type: 'button',
                    name: 'CTA Button',
                    text: 'Claim Deal',
                    x: 100,
                    y: 700,
                    width: 200,
                    height: 56,
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#131921',
                    backgroundColor: '#ff9900',
                    borderRadius: 4
                }
            ]
        },
        // Flipkart Templates
        {
            id: 'flipkart-sale-1',
            name: 'Flipkart Big Sale',
            category: 'flipkart',
            thumbnail: '/templates/flipkart-sale-1.png',
            size: { width: 1200, height: 628 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    gradient: 'linear-gradient(135deg, #2874f0 0%, #1a4fa0 100%)',
                    locked: true
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Sale Title',
                    text: 'Big Billion Days',
                    x: 80,
                    y: 180,
                    fontSize: 56,
                    fontWeight: 'bold',
                    color: '#ffe500',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Offer Text',
                    text: 'Exclusive Offers on Electronics',
                    x: 80,
                    y: 260,
                    fontSize: 24,
                    fontWeight: 'normal',
                    color: '#ffffff',
                    fontFamily: 'Inter'
                },
                {
                    id: 'shape-1',
                    type: 'shape',
                    name: 'Discount Badge',
                    shape: 'circle',
                    x: 950,
                    y: 200,
                    width: 180,
                    height: 180,
                    backgroundColor: '#ffe500'
                },
                {
                    id: 'text-3',
                    type: 'text',
                    name: 'Discount %',
                    text: '70%',
                    x: 995,
                    y: 305,
                    fontSize: 48,
                    fontWeight: 'bold',
                    color: '#2874f0',
                    fontFamily: 'Inter'
                },
                {
                    id: 'button-1',
                    type: 'button',
                    name: 'CTA Button',
                    text: 'Shop Now',
                    x: 80,
                    y: 330,
                    width: 180,
                    height: 50,
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#2874f0',
                    backgroundColor: '#ffe500',
                    borderRadius: 4
                }
            ]
        },
        {
            id: 'flipkart-fashion-1',
            name: 'Flipkart Fashion Sale',
            category: 'flipkart',
            thumbnail: '/templates/flipkart-fashion-1.png',
            size: { width: 1080, height: 1920 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    color: '#f8f8f8',
                    locked: true
                },
                {
                    id: 'shape-1',
                    type: 'shape',
                    name: 'Top Bar',
                    shape: 'rectangle',
                    x: 0,
                    y: 0,
                    width: 1080,
                    height: 200,
                    backgroundColor: '#2874f0'
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Brand',
                    text: 'FASHION SALE',
                    x: 60,
                    y: 130,
                    fontSize: 42,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Headline',
                    text: 'TRENDING\nSTYLES',
                    x: 60,
                    y: 800,
                    fontSize: 72,
                    fontWeight: 'bold',
                    color: '#2874f0',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-3',
                    type: 'text',
                    name: 'Discount',
                    text: 'Min 40% Off',
                    x: 60,
                    y: 1000,
                    fontSize: 36,
                    fontWeight: '600',
                    color: '#f43397',
                    fontFamily: 'Inter'
                },
                {
                    id: 'button-1',
                    type: 'button',
                    name: 'CTA Button',
                    text: 'Explore Collection',
                    x: 60,
                    y: 1100,
                    width: 300,
                    height: 64,
                    fontSize: 22,
                    fontWeight: '600',
                    color: '#ffffff',
                    backgroundColor: '#2874f0',
                    borderRadius: 32
                }
            ]
        },
        // Tesco Templates
        {
            id: 'tesco-clubcard-1',
            name: 'Tesco Clubcard Deal',
            category: 'tesco',
            thumbnail: '/templates/tesco-clubcard-1.png',
            size: { width: 1200, height: 628 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    color: '#FFFFFF',
                    locked: true
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Headline',
                    text: 'Exclusive Clubcard Price',
                    x: 80,
                    y: 120,
                    fontSize: 48,
                    fontWeight: '700',
                    color: '#0050AA',
                    fontFamily: 'Inter',
                    visible: true
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Product Name',
                    text: 'Premium Product Range',
                    x: 80,
                    y: 190,
                    fontSize: 32,
                    fontWeight: '600',
                    color: '#1a1a1a',
                    fontFamily: 'Inter',
                    visible: true
                },
                {
                    id: 'value-tile-1',
                    type: 'text',
                    name: 'Clubcard Price Tile',
                    text: '£7.99\nClubcard Price\nWas £9.99',
                    x: 900,
                    y: 100,
                    width: 220,
                    height: 120,
                    fontSize: 28,
                    fontWeight: '700',
                    color: '#FFFFFF',
                    backgroundColor: '#0050AA',
                    borderRadius: 4,
                    textAlign: 'center',
                    tesco: { 
                        type: 'valueTile', 
                        subtype: 'clubcard'
                    },
                    visible: true
                },
                {
                    id: 'tag-1',
                    type: 'text',
                    name: 'Tesco Tag',
                    text: 'Available in selected stores. Clubcard/app required. Ends 31/12',
                    x: 80,
                    y: 560,
                    width: 1040,
                    height: 30,
                    fontSize: 14,
                    fontWeight: '400',
                    color: '#64748b',
                    textAlign: 'center',
                    tesco: { type: 'tag', approved: true },
                    visible: true
                }
            ]
        },
        {
            id: 'tesco-everyday-price-1',
            name: 'Tesco Low Everyday Price',
            category: 'tesco',
            thumbnail: '/templates/tesco-lep-1.png',
            size: { width: 1200, height: 628 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    color: '#FFFFFF',
                    locked: true
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Headline',
                    text: 'Quality You Love',
                    x: 80,
                    y: 180,
                    fontSize: 56,
                    fontWeight: '700',
                    color: '#0050AA',
                    fontFamily: 'Inter',
                    textAlign: 'left',
                    visible: true
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Subheadline',
                    text: 'Prices You\'ll Love More',
                    x: 80,
                    y: 250,
                    fontSize: 28,
                    fontWeight: '500',
                    color: '#1a1a1a',
                    fontFamily: 'Inter',
                    visible: true
                },
                {
                    id: 'value-tile-1',
                    type: 'button',
                    name: 'Low Everyday Price Badge',
                    text: 'Low Everyday\nPrice',
                    x: 900,
                    y: 150,
                    width: 240,
                    height: 100,
                    fontSize: 24,
                    fontWeight: '700',
                    color: '#0050AA',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 4,
                    border: '3px solid #0050AA',
                    textAlign: 'center',
                    visible: true
                },
                {
                    id: 'tag-1',
                    type: 'text',
                    name: 'Tesco Tag',
                    text: 'Selected stores. While stocks last',
                    x: 80,
                    y: 560,
                    width: 1040,
                    height: 30,
                    fontSize: 14,
                    fontWeight: '400',
                    color: '#64748b',
                    textAlign: 'center',
                    tesco: { type: 'tag', approved: true },
                    visible: true
                }
            ]
        },
        {
            id: 'tesco-new-product-1',
            name: 'Tesco New Product Launch',
            category: 'tesco',
            thumbnail: '/templates/tesco-new-1.png',
            size: { width: 1080, height: 1080 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    gradient: 'linear-gradient(135deg, #0050AA 0%, #003C7F 100%)',
                    locked: true
                },
                {
                    id: 'value-tile-1',
                    type: 'button',
                    name: 'NEW Tile',
                    text: 'NEW',
                    x: 80,
                    y: 80,
                    width: 140,
                    height: 50,
                    fontSize: 24,
                    fontWeight: '700',
                    color: '#0050AA',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 4,
                    tesco: { 
                        type: 'valueTile', 
                        subtype: 'new' 
                    },
                    visible: true
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Headline',
                    text: 'Introducing\nOur Latest\nRange',
                    x: 80,
                    y: 350,
                    fontSize: 64,
                    fontWeight: '800',
                    color: '#FFFFFF',
                    fontFamily: 'Inter',
                    visible: true
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Description',
                    text: 'Discover something special',
                    x: 80,
                    y: 620,
                    fontSize: 24,
                    fontWeight: '400',
                    color: '#E0E7FF',
                    fontFamily: 'Inter',
                    visible: true
                },
                {
                    id: 'tag-1',
                    type: 'text',
                    name: 'Tesco Tag',
                    text: 'Only at Tesco',
                    x: 80,
                    y: 1000,
                    width: 920,
                    height: 30,
                    fontSize: 16,
                    fontWeight: '500',
                    color: '#FFFFFF',
                    textAlign: 'left',
                    tesco: { type: 'tag', approved: true },
                    visible: true
                }
            ]
        },
        {
            id: 'tesco-alcohol-1',
            name: 'Tesco Alcohol Promotion',
            category: 'tesco',
            thumbnail: '/templates/tesco-alcohol-1.png',
            size: { width: 1200, height: 628 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    color: '#1a1a1a',
                    locked: true
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Headline',
                    text: 'Premium Selection',
                    x: 80,
                    y: 160,
                    fontSize: 52,
                    fontWeight: '700',
                    color: '#FFFFFF',
                    fontFamily: 'Inter',
                    visible: true
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Subheadline',
                    text: 'Exclusive Wine & Spirits',
                    x: 80,
                    y: 230,
                    fontSize: 28,
                    fontWeight: '500',
                    color: '#EE1C2E',
                    fontFamily: 'Inter',
                    visible: true
                },
                {
                    id: 'value-tile-1',
                    type: 'text',
                    name: 'Clubcard Price Tile',
                    text: '£15.99\nClubcard Price',
                    x: 900,
                    y: 140,
                    width: 240,
                    height: 100,
                    fontSize: 28,
                    fontWeight: '700',
                    color: '#FFFFFF',
                    backgroundColor: '#0050AA',
                    borderRadius: 4,
                    textAlign: 'center',
                    tesco: { 
                        type: 'valueTile', 
                        subtype: 'clubcard' 
                    },
                    visible: true
                },
                {
                    id: 'drinkaware-1',
                    type: 'text',
                    name: 'Drinkaware',
                    text: 'drinkaware.co.uk',
                    x: 1000,
                    y: 560,
                    width: 140,
                    height: 24,
                    fontSize: 14,
                    fontWeight: '500',
                    color: '#FFFFFF',
                    tesco: { type: 'drinkaware', mandatory: true, minHeight: 20 },
                    visible: true
                },
                {
                    id: 'tag-1',
                    type: 'text',
                    name: 'Tesco Tag',
                    text: 'Available at Tesco',
                    x: 80,
                    y: 560,
                    width: 400,
                    height: 30,
                    fontSize: 14,
                    fontWeight: '400',
                    color: '#94a3b8',
                    textAlign: 'left',
                    tesco: { type: 'tag', approved: true },
                    visible: true
                }
            ]
        },
        // DMart Templates
        {
            id: 'dmart-grocery-1',
            name: 'DMart Grocery Deals',
            category: 'dmart',
            thumbnail: '/templates/dmart-grocery-1.png',
            size: { width: 1200, height: 628 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    color: '#ffffff',
                    locked: true
                },
                {
                    id: 'shape-1',
                    type: 'shape',
                    name: 'Header Strip',
                    shape: 'rectangle',
                    x: 0,
                    y: 0,
                    width: 1200,
                    height: 120,
                    backgroundColor: '#e31837'
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Brand',
                    text: 'DMart',
                    x: 80,
                    y: 80,
                    fontSize: 48,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Headline',
                    text: 'Weekly Savings',
                    x: 80,
                    y: 280,
                    fontSize: 64,
                    fontWeight: 'bold',
                    color: '#e31837',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-3',
                    type: 'text',
                    name: 'Subheadline',
                    text: 'Fresh Groceries at Best Prices',
                    x: 80,
                    y: 360,
                    fontSize: 28,
                    fontWeight: 'normal',
                    color: '#333333',
                    fontFamily: 'Inter'
                },
                {
                    id: 'shape-2',
                    type: 'shape',
                    name: 'Price Tag',
                    shape: 'rectangle',
                    x: 900,
                    y: 250,
                    width: 220,
                    height: 150,
                    backgroundColor: '#ffc107',
                    borderRadius: 8
                },
                {
                    id: 'text-4',
                    type: 'text',
                    name: 'Discount',
                    text: 'Up to\n30% OFF',
                    x: 940,
                    y: 330,
                    fontSize: 32,
                    fontWeight: 'bold',
                    color: '#e31837',
                    fontFamily: 'Inter'
                },
                {
                    id: 'button-1',
                    type: 'button',
                    name: 'CTA Button',
                    text: 'Shop Groceries',
                    x: 80,
                    y: 440,
                    width: 220,
                    height: 56,
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#ffffff',
                    backgroundColor: '#e31837',
                    borderRadius: 4
                }
            ]
        },
        // Generic Templates
        {
            id: 'minimal-product-1',
            name: 'Minimal Product',
            category: 'generic',
            thumbnail: '/templates/minimal-product-1.png',
            size: { width: 1080, height: 1080 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    color: '#f5f5f5',
                    locked: true
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Headline',
                    text: 'NEW ARRIVAL',
                    x: 100,
                    y: 200,
                    fontSize: 48,
                    fontWeight: 'bold',
                    color: '#1a1a1a',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Product Name',
                    text: 'Product Name',
                    x: 100,
                    y: 700,
                    fontSize: 36,
                    fontWeight: '600',
                    color: '#1a1a1a',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-3',
                    type: 'text',
                    name: 'Price',
                    text: '₹999',
                    x: 100,
                    y: 770,
                    fontSize: 42,
                    fontWeight: 'bold',
                    color: '#6366f1',
                    fontFamily: 'Inter'
                },
                {
                    id: 'button-1',
                    type: 'button',
                    name: 'CTA Button',
                    text: 'Shop Now',
                    x: 100,
                    y: 860,
                    width: 180,
                    height: 50,
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#ffffff',
                    backgroundColor: '#1a1a1a',
                    borderRadius: 25
                }
            ]
        },
        {
            id: 'bold-gradient-1',
            name: 'Bold Gradient',
            category: 'generic',
            thumbnail: '/templates/bold-gradient-1.png',
            size: { width: 1200, height: 628 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f97316 100%)',
                    locked: true
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Headline',
                    text: 'BIG SALE',
                    x: 100,
                    y: 220,
                    fontSize: 96,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Subheadline',
                    text: 'Limited Time Offer',
                    x: 100,
                    y: 300,
                    fontSize: 32,
                    fontWeight: 'normal',
                    color: 'rgba(255,255,255,0.8)',
                    fontFamily: 'Inter'
                },
                {
                    id: 'button-1',
                    type: 'button',
                    name: 'CTA Button',
                    text: 'Shop Now',
                    x: 100,
                    y: 380,
                    width: 200,
                    height: 56,
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#667eea',
                    backgroundColor: '#ffffff',
                    borderRadius: 28
                }
            ]
        },
        {
            id: 'festive-diwali-1',
            name: 'Diwali Festival',
            category: 'festive',
            thumbnail: '/templates/festive-diwali-1.png',
            size: { width: 1080, height: 1080 },
            elements: [
                {
                    id: 'bg-1',
                    type: 'background',
                    name: 'Background',
                    gradient: 'linear-gradient(180deg, #1a0a2e 0%, #3d1a5c 100%)',
                    locked: true
                },
                {
                    id: 'text-1',
                    type: 'text',
                    name: 'Festival Name',
                    text: 'HAPPY DIWALI',
                    x: 100,
                    y: 200,
                    fontSize: 64,
                    fontWeight: 'bold',
                    color: '#ffd700',
                    fontFamily: 'Inter'
                },
                {
                    id: 'text-2',
                    type: 'text',
                    name: 'Offer Text',
                    text: 'Festival Special Offers',
                    x: 100,
                    y: 280,
                    fontSize: 28,
                    fontWeight: 'normal',
                    color: '#ffffff',
                    fontFamily: 'Inter'
                },
                {
                    id: 'shape-1',
                    type: 'shape',
                    name: 'Decorative Shape',
                    shape: 'circle',
                    x: 750,
                    y: 100,
                    width: 250,
                    height: 250,
                    backgroundColor: 'rgba(255, 215, 0, 0.2)'
                },
                {
                    id: 'text-3',
                    type: 'text',
                    name: 'Discount',
                    text: 'UP TO 70% OFF',
                    x: 100,
                    y: 700,
                    fontSize: 48,
                    fontWeight: 'bold',
                    color: '#ff6b35',
                    fontFamily: 'Inter'
                },
                {
                    id: 'button-1',
                    type: 'button',
                    name: 'CTA Button',
                    text: 'Explore Offers',
                    x: 100,
                    y: 800,
                    width: 240,
                    height: 60,
                    fontSize: 22,
                    fontWeight: '600',
                    color: '#1a0a2e',
                    backgroundColor: '#ffd700',
                    borderRadius: 30
                }
            ]
        }
    ],

    categories: [
        { id: 'all', name: 'All Templates', icon: 'th-large' },
        { id: 'amazon', name: 'Amazon', icon: 'amazon', color: '#ff9900' },
        { id: 'flipkart', name: 'Flipkart', icon: 'shopping-bag', color: '#2874f0' },
        { id: 'dmart', name: 'DMart', icon: 'store', color: '#e31837' },
        { id: 'tesco', name: 'Tesco', icon: 'shopping-cart', color: '#0050AA' },
        { id: 'generic', name: 'Generic', icon: 'palette', color: '#6366f1' },
        { id: 'festive', name: 'Festive', icon: 'star', color: '#ffd700' }
    ],

    // Filter templates by category
    getByCategory(category) {
        if (category === 'all') {
            return this.templates;
        }
        return this.templates.filter(t => t.category === category);
    },

    // Get template by ID
    getById(id) {
        return this.templates.find(t => t.id === id);
    },

    // Render template card HTML
    renderCard(template) {
        const categoryInfo = this.categories.find(c => c.id === template.category);
        
        return `
            <div class="template-card" data-id="${template.id}">
                <div class="template-preview">
                    <div class="template-preview-canvas" style="aspect-ratio: ${template.size.width}/${template.size.height};">
                        <!-- Preview will be rendered here -->
                    </div>
                    <div class="template-overlay">
                        <button class="btn btn-primary btn-sm template-use-btn">
                            <i class="fas fa-magic"></i> Use Template
                        </button>
                        <button class="btn btn-ghost btn-sm template-preview-btn">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                    </div>
                </div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-meta">
                        <span class="template-category" style="color: ${categoryInfo?.color || '#888'}">
                            <i class="fas fa-${categoryInfo?.icon || 'tag'}"></i>
                            ${categoryInfo?.name || template.category}
                        </span>
                        <span class="template-size">${template.size.width} × ${template.size.height}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // Render template gallery
    renderGallery(containerId, category = 'all') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const templates = this.getByCategory(category);
        
        // Render category filters
        const filtersHtml = this.categories.map(cat => `
            <button class="template-filter-btn ${cat.id === category ? 'active' : ''}" 
                    data-category="${cat.id}"
                    style="${cat.id === category ? `--active-color: ${cat.color}` : ''}">
                <i class="fas fa-${cat.icon}"></i>
                ${cat.name}
            </button>
        `).join('');

        // Render templates
        const templatesHtml = templates.map(t => this.renderCard(t)).join('');

        container.innerHTML = `
            <div class="template-gallery-header">
                <h3 class="template-gallery-title">
                    <i class="fas fa-palette"></i>
                    Template Library
                </h3>
                <div class="template-search">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Search templates..." id="templateSearch">
                </div>
            </div>
            <div class="template-filters">
                ${filtersHtml}
            </div>
            <div class="template-grid">
                ${templatesHtml}
            </div>
        `;

        // Bind events
        this.bindEvents(container, containerId);
    },

    // Bind gallery events
    bindEvents(container, containerId) {
        // Category filter clicks
        container.querySelectorAll('.template-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.renderGallery(containerId, category);
            });
        });

        // Template card clicks
        container.querySelectorAll('.template-use-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.template-card');
                const template = this.getById(card.dataset.id);
                this.useTemplate(template);
            });
        });

        // Search
        const searchInput = container.querySelector('#templateSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterBySearch(container, e.target.value);
            });
        }
    },

    // Filter templates by search
    filterBySearch(container, query) {
        const cards = container.querySelectorAll('.template-card');
        const lowerQuery = query.toLowerCase();

        cards.forEach(card => {
            const template = this.getById(card.dataset.id);
            const matches = template.name.toLowerCase().includes(lowerQuery) ||
                           template.category.toLowerCase().includes(lowerQuery);
            card.style.display = matches ? 'block' : 'none';
        });
    },

    // Use a template
    useTemplate(template) {
        if (!template) return;

        // Deep clone the template
        const creativeData = {
            elements: JSON.parse(JSON.stringify(template.elements)),
            size: { ...template.size },
            platform: template.category !== 'generic' && template.category !== 'festive' 
                     ? template.category : 'amazon',
            templateId: template.id,
            templateName: template.name
        };

        // Save to session and navigate to editor
        sessionStorage.setItem('currentCreative', JSON.stringify(creativeData));
        
        // Navigate to editor
        window.location.href = 'editor_new.html';
    },

    // Generate preview image from template
    generatePreview(template, canvas) {
        const ctx = canvas.getContext('2d');
        const scale = canvas.width / template.size.width;

        canvas.height = template.size.height * scale;

        ctx.scale(scale, scale);

        template.elements.forEach(el => {
            this.drawElement(ctx, el, template.size);
        });
    },

    // Draw element for preview
    drawElement(ctx, el, canvasSize) {
        switch (el.type) {
            case 'background':
                ctx.fillStyle = el.color || '#1a1a2e';
                ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
                break;

            case 'text':
                ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize}px Inter, sans-serif`;
                ctx.fillStyle = el.color || '#ffffff';
                ctx.fillText(el.text, el.x, el.y);
                break;

            case 'button':
                ctx.fillStyle = el.backgroundColor || '#6366f1';
                this.roundRect(ctx, el.x, el.y, el.width, el.height, el.borderRadius || 8);
                ctx.fill();

                ctx.font = `${el.fontWeight || '600'} ${el.fontSize}px Inter, sans-serif`;
                ctx.fillStyle = el.color || '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.text, el.x + el.width / 2, el.y + el.height / 2);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                break;

            case 'shape':
                ctx.fillStyle = el.backgroundColor || '#6366f1';
                if (el.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(el.x + el.width / 2, el.y + el.height / 2, 
                           Math.min(el.width, el.height) / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    this.roundRect(ctx, el.x, el.y, el.width, el.height, el.borderRadius || 0);
                    ctx.fill();
                }
                break;
        }
    },

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateLibrary;
}
