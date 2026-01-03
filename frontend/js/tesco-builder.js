/**
 * Tesco Creative Builder - Appendix A & B Implementation
 * Comprehensive system for Tesco-compliant creative generation
 */

const TescoBuilder = {
    // Appendix A Configuration
    config: {
        valueTiles: {
            new: {
                editable: false,
                text: 'NEW',
                fontSize: 20,
                color: '#0050AA',
                backgroundColor: '#FFFFFF',
                locked: true
            },
            white: {
                editable: true,
                editableFields: ['price'],
                fontSize: 28,
                color: '#0050AA',
                backgroundColor: '#FFFFFF',
                locked: true
            },
            clubcard: {
                editable: true,
                editableFields: ['offerPrice', 'regularPrice'],
                fontSize: 24,
                color: '#FFFFFF',
                backgroundColor: '#0050AA',
                requiresEndDate: true,
                locked: true
            }
        },
        
        tags: {
            approved: [
                'Only at Tesco',
                'Available at Tesco',
                'Selected stores. While stocks last'
            ],
            clubcard: 'Available in selected stores. Clubcard/app required. Ends DD/MM'
        },
        
        safeZones: {
            '9:16': {
                top: 200,
                bottom: 250
            }
        },
        
        packshots: {
            max: 3,
            required: true
        },
        
        fonts: {
            minimum: {
                brand: 20,
                social: 20,
                checkoutDouble: 20,
                checkoutSingle: 10,
                says: 12
            }
        },
        
        drinkaware: {
            minHeight: 20,
            minHeightSays: 12,
            allowedColors: ['#000000', '#FFFFFF'],
            mandatory: 'alcohol'
        }
    },

    // Appendix B Validation Rules
    validationRules: {
        // Hard Fail Rules
        hardFail: {
            alcohol_drinkaware: (elements) => {
                const hasAlcohol = elements.some(el => 
                    el.metadata?.category === 'alcohol'
                );
                
                if (!hasAlcohol) return { passed: true };
                
                const drinkaware = elements.find(el => 
                    el.tesco?.type === 'drinkaware'
                );
                
                if (!drinkaware) {
                    return {
                        passed: false,
                        message: 'Drinkaware logo required for alcohol promotions',
                        severity: 'error'
                    };
                }
                
                if (drinkaware.height < 20) {
                    return {
                        passed: false,
                        message: `Drinkaware minimum height is 20px (current: ${drinkaware.height}px)`,
                        severity: 'error'
                    };
                }
                
                const validColors = ['#000000', '#FFFFFF', '#000', '#fff'];
                if (!validColors.includes(drinkaware.color)) {
                    return {
                        passed: false,
                        message: 'Drinkaware must be black or white only',
                        severity: 'error'
                    };
                }
                
                return { passed: true };
            },

            no_tcs: (elements) => {
                const forbiddenPatterns = [
                    /terms\s+and\s+conditions/i,
                    /t&c's?/i,
                    /terms\s+apply/i,
                    /\*/,  // Asterisks indicate claims
                ];
                
                for (const el of elements) {
                    if (el.type === 'text' || el.type === 'button') {
                        const text = el.text || '';
                        for (const pattern of forbiddenPatterns) {
                            if (pattern.test(text)) {
                                return {
                                    passed: false,
                                    message: `T&Cs not allowed: "${text}"`,
                                    severity: 'error',
                                    element: el.id
                                };
                            }
                        }
                    }
                }
                return { passed: true };
            },

            no_competitions: (elements) => {
                const forbiddenWords = [
                    'competition', 'win', 'prize', 'enter to win', 
                    'giveaway', 'contest', 'sweepstakes'
                ];
                
                for (const el of elements) {
                    if (el.type === 'text' || el.type === 'button') {
                        const text = (el.text || '').toLowerCase();
                        for (const word of forbiddenWords) {
                            if (text.includes(word)) {
                                return {
                                    passed: false,
                                    message: `Competition copy not allowed: "${word}"`,
                                    severity: 'error',
                                    element: el.id
                                };
                            }
                        }
                    }
                }
                return { passed: true };
            },

            no_sustainability: (elements) => {
                const greenClaims = [
                    'eco-friendly', 'sustainable', 'carbon neutral', 
                    'green', 'eco', 'planet-friendly', 'environmentally'
                ];
                
                for (const el of elements) {
                    if (el.type === 'text' || el.type === 'button') {
                        const text = (el.text || '').toLowerCase();
                        for (const claim of greenClaims) {
                            if (text.includes(claim)) {
                                return {
                                    passed: false,
                                    message: `Sustainability claims not allowed: "${claim}"`,
                                    severity: 'error',
                                    element: el.id
                                };
                            }
                        }
                    }
                }
                return { passed: true };
            },

            no_price_callouts: (elements) => {
                const pricePatterns = [
                    /£\d+/,  // £10
                    /\d+%\s*off/i,  // 20% off
                    /\b(save|saving|discount|deal|offer|was|now)\b/i
                ];
                
                for (const el of elements) {
                    // Skip value tiles - prices are allowed there
                    if (el.tesco?.type === 'valueTile') continue;
                    
                    if (el.type === 'text' || el.type === 'button') {
                        const text = el.text || '';
                        for (const pattern of pricePatterns) {
                            if (pattern.test(text)) {
                                return {
                                    passed: false,
                                    message: `Price callouts only allowed in value tiles: "${text}"`,
                                    severity: 'error',
                                    element: el.id
                                };
                            }
                        }
                    }
                }
                return { passed: true };
            },

            approved_tags_only: (elements) => {
                const approvedTags = [
                    'Only at Tesco',
                    'Available at Tesco',
                    'Selected stores. While stocks last',
                    'Available in selected stores. Clubcard/app required. Ends DD/MM'
                ];
                
                const tags = elements.filter(el => el.tesco?.type === 'tag');
                
                for (const tag of tags) {
                    const text = tag.text || '';
                    
                    // Check for DD/MM pattern if it's a Clubcard tag
                    const hasClubcardText = text.includes('Clubcard');
                    if (hasClubcardText) {
                        const datePattern = /\b\d{2}\/\d{2}\b/;
                        if (!datePattern.test(text)) {
                            return {
                                passed: false,
                                message: 'Clubcard tag must include end date in DD/MM format',
                                severity: 'error',
                                element: tag.id
                            };
                        }
                        continue; // Valid Clubcard tag with date
                    }
                    
                    // Check if it's an approved tag
                    if (!approvedTags.includes(text)) {
                        return {
                            passed: false,
                            message: `Only approved Tesco tags allowed. Found: "${text}"`,
                            severity: 'error',
                            element: tag.id,
                            suggestion: approvedTags
                        };
                    }
                }
                return { passed: true };
            },

            minimum_font_size: (elements, canvasType = 'brand') => {
                const minimums = {
                    brand: 20,
                    social: 20,
                    checkoutDouble: 20,
                    checkoutSingle: 10,
                    says: 12
                };
                
                const minSize = minimums[canvasType] || 20;
                
                for (const el of elements) {
                    if (el.type === 'text' || el.type === 'button') {
                        const fontSize = el.fontSize || 12;
                        if (fontSize < minSize) {
                            return {
                                passed: false,
                                message: `Font size ${fontSize}px below minimum ${minSize}px for ${canvasType}`,
                                severity: 'error',
                                element: el.id
                            };
                        }
                    }
                }
                return { passed: true };
            },

            social_safe_zone: (elements, dimensions) => {
                // Only applies to 9:16 format
                const ratio = dimensions.width / dimensions.height;
                if (Math.abs(ratio - (9/16)) > 0.01) {
                    return { passed: true }; // Not 9:16, rule doesn't apply
                }
                
                const topSafeZone = 200;
                const bottomSafeZone = dimensions.height - 250;
                
                for (const el of elements) {
                    if (el.type === 'text' || el.tesco?.type === 'tag' || el.tesco?.type === 'valueTile') {
                        if (el.y < topSafeZone) {
                            return {
                                passed: false,
                                message: `Element must be at least 200px from top (current: ${el.y}px)`,
                                severity: 'error',
                                element: el.id
                            };
                        }
                        
                        if (el.y + el.height > bottomSafeZone) {
                            return {
                                passed: false,
                                message: `Element must be at least 250px from bottom`,
                                severity: 'error',
                                element: el.id
                            };
                        }
                    }
                }
                return { passed: true };
            },

            value_tile_validation: (elements) => {
                const valueTiles = elements.filter(el => el.tesco?.type === 'valueTile');
                
                for (const tile of valueTiles) {
                    // Check for overlapping elements
                    for (const el of elements) {
                        if (el.id === tile.id) continue;
                        
                        const overlaps = !(
                            el.x + el.width < tile.x ||
                            el.x > tile.x + tile.width ||
                            el.y + el.height < tile.y ||
                            el.y > tile.y + tile.height
                        );
                        
                        if (overlaps) {
                            return {
                                passed: false,
                                message: `Content cannot overlay value tile`,
                                severity: 'error',
                                element: el.id
                            };
                        }
                    }
                }
                return { passed: true };
            }
        },

        // Warning Rules
        warnings: {
            photography_of_people: (elements, imageData) => {
                // This would require AI image analysis
                // For now, we'll return a prompt for user confirmation
                return {
                    passed: true,
                    requiresConfirmation: true,
                    message: 'If your creative includes photography of people, confirm they are integral to the campaign',
                    severity: 'warning'
                };
            }
        }
    },

    // Template Generator
    generateTemplate(platform, dimensions) {
        const templates = {
            lowEverydayPrice: {
                name: 'Low Everyday Price',
                elements: [
                    {
                        type: 'text',
                        name: 'LEP Logo',
                        text: 'Low Everyday Price',
                        x: dimensions.width - 200,
                        y: dimensions.height / 2 - 30,
                        width: 180,
                        height: 60,
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#0050AA',
                        backgroundColor: '#FFFFFF',
                        textAlign: 'right',
                        tesco: { template: 'lep' }
                    },
                    {
                        type: 'text',
                        name: 'Tag',
                        text: 'Selected stores. While stocks last',
                        x: 20,
                        y: dimensions.height - 50,
                        width: dimensions.width - 40,
                        height: 30,
                        fontSize: 12,
                        color: '#64748b',
                        textAlign: 'center',
                        tesco: { type: 'tag', approved: true }
                    }
                ],
                backgroundColor: '#FFFFFF',
                rules: ['no_branded_content', 'left_aligned_copy']
            }
        };
        
        return templates;
    },

    // Validation Runner
    async validateCreative(elements, dimensions, canvasType = 'brand') {
        const results = [];
        
        // Run all hard fail rules
        for (const [ruleName, ruleFunc] of Object.entries(this.validationRules.hardFail)) {
            try {
                const result = ruleFunc(elements, dimensions, canvasType);
                results.push({
                    rule: ruleName,
                    ...result
                });
            } catch (error) {
                console.error(`Error in rule ${ruleName}:`, error);
            }
        }
        
        // Run warning rules
        for (const [ruleName, ruleFunc] of Object.entries(this.validationRules.warnings)) {
            try {
                const result = ruleFunc(elements, dimensions);
                results.push({
                    rule: ruleName,
                    ...result
                });
            } catch (error) {
                console.error(`Error in rule ${ruleName}:`, error);
            }
        }
        
        return results;
    },

    // Display validation results
    displayValidationResults(results, container) {
        const errors = results.filter(r => !r.passed && r.severity === 'error');
        const warnings = results.filter(r => r.severity === 'warning' || r.requiresConfirmation);
        
        let html = '<div class="tesco-validation-results">';
        
        if (errors.length > 0) {
            html += '<div class="validation-errors"><h4><i class="fas fa-times-circle"></i> Errors Found</h4><ul>';
            errors.forEach(err => {
                html += `<li class="error-item">
                    <strong>${err.rule}:</strong> ${err.message}
                    ${err.suggestion ? `<div class="suggestion">Allowed: ${err.suggestion.join(', ')}</div>` : ''}
                </li>`;
            });
            html += '</ul></div>';
        }
        
        if (warnings.length > 0) {
            html += '<div class="validation-warnings"><h4><i class="fas fa-exclamation-triangle"></i> Warnings</h4><ul>';
            warnings.forEach(warn => {
                html += `<li class="warning-item">${warn.message}</li>`;
            });
            html += '</ul></div>';
        }
        
        if (errors.length === 0 && warnings.length === 0) {
            html += '<div class="validation-success"><i class="fas fa-check-circle"></i> All Tesco guidelines met!</div>';
        }
        
        html += '</div>';
        
        if (container) {
            container.innerHTML = html;
        }
        
        return html;
    },

    // Helper: Calculate contrast ratio (WCAG)
    calculateContrast(color1, color2) {
        const getLuminance = (hex) => {
            hex = hex.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16) / 255;
            const g = parseInt(hex.substr(2, 2), 16) / 255;
            const b = parseInt(hex.substr(4, 2), 16) / 255;
            
            const [rs, gs, bs] = [r, g, b].map(c => 
                c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
            );
            
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };
        
        const l1 = getLuminance(color1);
        const l2 = getLuminance(color2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        
        return (lighter + 0.05) / (darker + 0.05);
    },

    // Helper: Check contrast meets WCAG AA
    meetsWCAGAA(color1, color2, isLargeText = false) {
        const ratio = this.calculateContrast(color1, color2);
        const required = isLargeText ? 3.0 : 4.5;
        return {
            passed: ratio >= required,
            ratio: ratio.toFixed(2),
            required: required
        };
    }
};

// Export for use in editor
if (typeof window !== 'undefined') {
    window.TescoBuilder = TescoBuilder;
}
