// pixelRenderer.js
// Enhanced pixel rendering system for bitCraft.js v0.02

const PixelRenderer = {
    // Pixel patterns for different entity types
    patterns: {
        solid: function(ctx, x, y, size, color) {
            ctx.fillStyle = color;
            ctx.fillRect(x - size/2, y - size/2, size, size);
        },

        sparse: function(ctx, x, y, size, color) {
            ctx.fillStyle = color;
            const pixelSize = GameConfig.graphics.pixelSize;
            for (let i = 0; i < size; i += pixelSize * 2) {
                for (let j = 0; j < size; j += pixelSize * 2) {
                    if (Math.random() > 0.3) {
                        ctx.fillRect(x - size/2 + i, y - size/2 + j, pixelSize, pixelSize);
                    }
                }
            }
        },

        tree: function(ctx, x, y, size, color, entity) {
            // Draw trunk
            const trunkWidth = size * 0.4;
            const trunkHeight = size * 1.2;
            ctx.fillStyle = entity.trunkColor || '#654321';
            ctx.fillRect(x - trunkWidth/2, y - trunkHeight, trunkWidth, trunkHeight);
            
            // Draw leaves with pixel pattern
            ctx.fillStyle = entity.leafColor || '#2E8B57';
            const leafRadius = size;
            const pixelSize = GameConfig.graphics.pixelSize;
            
            for (let i = -leafRadius; i < leafRadius; i += pixelSize) {
                for (let j = -leafRadius; j < leafRadius; j += pixelSize) {
                    const dist = Math.sqrt(i*i + j*j);
                    if (dist < leafRadius && Math.random() > 0.2) {
                        ctx.fillRect(x + i, y - trunkHeight + j, pixelSize, pixelSize);
                    }
                }
            }
        },

        turret: function(ctx, x, y, size, color) {
            // Base
            ctx.fillStyle = color;
            ctx.fillRect(x - size/2, y - size/2, size, size);
            
            // Core with pixel detail
            ctx.fillStyle = '#ffff00';
            const coreSize = size * 0.6;
            ctx.fillRect(x - coreSize/2, y - coreSize/2, coreSize, coreSize);
            
            // Pixel details
            ctx.fillStyle = '#ffffff';
            const pixelSize = GameConfig.graphics.pixelSize;
            ctx.fillRect(x - pixelSize, y - pixelSize, pixelSize, pixelSize);
            ctx.fillRect(x + pixelSize, y + pixelSize, pixelSize, pixelSize);
        },

        ballLightning: function(ctx, x, y, pixels, alpha = 1) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            
            for (const pixel of pixels) {
                ctx.fillStyle = pixel.color;
                ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size);
            }
            
            ctx.restore();
        }
    },

    // Enhanced drawing function
    drawEntity: function(ctx, entity) {
        const pattern = this.patterns[entity.pixelPattern] || this.patterns.solid;
        
        if (entity.type === 'ball_lightning') {
            const alpha = entity.life / entity.maxLife;
            this.patterns.ballLightning(ctx, entity.x, entity.y, entity.pixels, alpha);
        } else {
            pattern(ctx, entity.x, entity.y, entity.size, entity.color, entity);
        }

        // Draw health bar if entity has health
        if (entity.health !== undefined && entity.maxHealth && entity.health < entity.maxHealth) {
            this.drawHealthBar(ctx, entity);
        }

        // Draw resource indicators
        if (entity.wood !== undefined && entity.wood > 0) {
            this.drawResourceIndicator(ctx, entity, 'wood', entity.wood, entity.maxWood || entity.wood);
        }
        if (entity.stone !== undefined && entity.stone > 0) {
            this.drawResourceIndicator(ctx, entity, 'stone', entity.stone, entity.maxStone || entity.stone);
        }
    },

    drawHealthBar: function(ctx, entity) {
        const barWidth = entity.size * 1.5;
        const barHeight = GameConfig.graphics.healthBarHeight;
        const barY = entity.y + entity.size/2 + 6;
        const healthPercentage = entity.health / entity.maxHealth;

        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(entity.x - barWidth/2, barY, barWidth, barHeight);
        
        // Health
        ctx.fillStyle = healthPercentage > 0.5 ? '#0f0' : healthPercentage > 0.25 ? '#ff0' : '#f00';
        ctx.fillRect(entity.x - barWidth/2, barY, barWidth * healthPercentage, barHeight);
    },

    drawResourceIndicator: function(ctx, entity, type, current, max) {
        const barWidth = entity.size;
        const barHeight = 2;
        const barY = entity.y - entity.size/2 - 8;
        const percentage = current / max;

        ctx.fillStyle = '#222';
        ctx.fillRect(entity.x - barWidth/2, barY, barWidth, barHeight);
        
        ctx.fillStyle = type === 'wood' ? '#8B4513' : '#696969';
        ctx.fillRect(entity.x - barWidth/2, barY, barWidth * percentage, barHeight);
    },

    // Enhanced selection highlight
    drawSelectionHighlight: function(ctx, entity, camera) {
        ctx.strokeStyle = GameConfig.graphics.selectionColor;
        ctx.lineWidth = GameConfig.graphics.selectionWidth / camera.zoom;
        ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
        
        ctx.beginPath();
        if (entity.type === 'player_unit') {
            ctx.arc(entity.x, entity.y, entity.size + 2, 0, Math.PI * 2);
        } else {
            ctx.rect(entity.x - entity.size/2 - 2, entity.y - entity.size/2 - 2, entity.size + 4, entity.size + 4);
        }
        ctx.stroke();
        
        // Range indicator for turrets
        if (entity.range) {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.setLineDash([2 / camera.zoom, 6 / camera.zoom]);
            ctx.beginPath();
            ctx.arc(entity.x, entity.y, entity.range, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    },

    // Enhanced selection box
    drawSelectionBox: function(ctx, start, end, camera) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.fillStyle = 'rgba(255, 255, 0, 0.15)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([3 / camera.zoom, 3 / camera.zoom]);
        
        const rect = {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            w: Math.abs(start.x - end.x),
            h: Math.abs(start.y - end.y)
        };
        
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        ctx.setLineDash([]);
    },

    // Enhanced tooltip
    drawTooltip: function(ctx, entity, mousePos) {
        let text = entity.id || entity.type || 'Object';
        if (entity.health !== undefined) {
            text += ` (${Math.ceil(entity.health)}/${entity.maxHealth})`;
        }
        if (entity.type === 'tree' && entity.wood !== undefined) {
            text += ` [Wood: ${entity.wood}]`;
        }
        if (entity.type === 'rock' && entity.stone !== undefined) {
            text += ` [Stone: ${entity.stone}]`;
        }

        ctx.font = GameConfig.graphics.tooltipFont;
        const metrics = ctx.measureText(text);
        const padding = 6;
        const tooltipX = mousePos.x + 20;
        const tooltipY = mousePos.y + 10;

        // Background with border
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(tooltipX - padding, tooltipY - 14, metrics.width + padding * 2, 20);
        
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(tooltipX - padding, tooltipY - 14, metrics.width + padding * 2, 20);
        
        // Text
        ctx.fillStyle = '#fff';
        ctx.fillText(text, tooltipX, tooltipY);
    },

    // Enhanced targeting reticule
    drawTargetingReticule: function(ctx, mousePos) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        const time = Date.now() * 0.005;
        const pulse = Math.sin(time) * 0.3 + 0.7;
        
        ctx.strokeStyle = `rgba(255, 0, 0, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 16, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(mousePos.x - 12, mousePos.y);
        ctx.lineTo(mousePos.x + 12, mousePos.y);
        ctx.moveTo(mousePos.x, mousePos.y - 12);
        ctx.lineTo(mousePos.x, mousePos.y + 12);
        ctx.stroke();
        
        ctx.restore();
    }
};


