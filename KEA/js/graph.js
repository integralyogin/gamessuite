/**
 * Graph Manager - D3.js-based interactive knowledge graph visualization
 */

class GraphManager {
    constructor(app) {
        this.app = app;
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.nodeElements = null;
        this.linkElements = null;
        this.labelElements = null;
        this.zoom = null;
        this.transform = d3.zoomIdentity;
        this.width = 0;
        this.height = 0;
        this.tooltip = null;
        
        // Graph settings
        this.settings = {
            nodeRadius: 20,
            linkDistance: 150,
            chargeStrength: -300,
            centerForce: 0.1,
            collisionRadius: 25
        };
    }

    initialize() {
        this.createSVG();
        this.createTooltip();
        this.setupZoom();
        this.setupSimulation();
        this.setupEventListeners();
    }

    createSVG() {
        const container = document.getElementById('graph-canvas');
        if (!container) {
            console.error('Graph canvas container not found');
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Get dimensions
        const rect = container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        // Create SVG
        this.svg = d3.select(container)
            .append('svg')
            .attr('class', 'graph-svg')
            .attr('width', this.width)
            .attr('height', this.height);

        // Create groups for different elements
        this.svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'arrowhead');

        this.linkGroup = this.svg.append('g').attr('class', 'links');
        this.nodeGroup = this.svg.append('g').attr('class', 'nodes');
        this.labelGroup = this.svg.append('g').attr('class', 'labels');

        // Handle resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    createTooltip() {
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'graph-tooltip')
            .style('opacity', 0);
    }

    setupZoom() {
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.transform = event.transform;
                this.nodeGroup.attr('transform', this.transform);
                this.linkGroup.attr('transform', this.transform);
                this.labelGroup.attr('transform', this.transform);
            });

        this.svg.call(this.zoom);
    }

    setupSimulation() {
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(this.settings.linkDistance))
            .force('charge', d3.forceManyBody().strength(this.settings.chargeStrength))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(this.settings.collisionRadius))
            .on('tick', () => this.tick());
    }

    setupEventListeners() {
        // Graph controls
        document.getElementById('layout-select')?.addEventListener('change', (e) => {
            this.changeLayout(e.target.value);
        });

        document.getElementById('node-size-slider')?.addEventListener('input', (e) => {
            this.settings.nodeRadius = parseInt(e.target.value);
            this.updateNodeSizes();
        });

        document.getElementById('link-distance-slider')?.addEventListener('input', (e) => {
            this.settings.linkDistance = parseInt(e.target.value);
            this.simulation.force('link').distance(this.settings.linkDistance);
            this.simulation.alpha(0.3).restart();
        });

        // Zoom controls
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
            this.zoomOut();
        });

        document.getElementById('center-view-btn')?.addEventListener('click', () => {
            this.centerView();
        });
    }

    render(data) {
        if (!this.svg || !data) return;

        // Convert data to graph format
        this.prepareGraphData(data);

        // Update simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link').links(this.links);

        // Render elements
        this.renderLinks();
        this.renderNodes();
        this.renderLabels();

        // Restart simulation
        this.simulation.alpha(1).restart();

        console.log(`📊 Rendered graph with ${this.nodes.length} nodes and ${this.links.length} links`);
    }

    prepareGraphData(data) {
        // Create nodes
        this.nodes = [];
        const nodeMap = new Map();

        for (const [name, concept] of data) {
            const node = {
                id: concept.id,
                name: name,
                category: concept.category,
                definitions: concept.definitions,
                metadata: concept.metadata,
                x: Math.random() * this.width,
                y: Math.random() * this.height
            };
            this.nodes.push(node);
            nodeMap.set(name, node);
        }

        // Create links
        this.links = [];
        for (const [name, concept] of data) {
            const sourceNode = nodeMap.get(name);
            if (!sourceNode) continue;

            // Parent-child relationships
            concept.children.forEach(childName => {
                const targetNode = nodeMap.get(childName);
                if (targetNode) {
                    this.links.push({
                        source: sourceNode,
                        target: targetNode,
                        type: 'parent-child'
                    });
                }
            });

            // Sibling relationships
            concept.siblings.forEach(siblingName => {
                const targetNode = nodeMap.get(siblingName);
                if (targetNode && name < siblingName) { // Avoid duplicates
                    this.links.push({
                        source: sourceNode,
                        target: targetNode,
                        type: 'sibling'
                    });
                }
            });

            // Related concepts
            if (concept.related) {
                concept.related.forEach(relatedName => {
                    const targetNode = nodeMap.get(relatedName);
                    if (targetNode && name < relatedName) { // Avoid duplicates
                        this.links.push({
                            source: sourceNode,
                            target: targetNode,
                            type: 'related'
                        });
                    }
                });
            }
        }
    }

    renderNodes() {
        this.nodeElements = this.nodeGroup
            .selectAll('.node')
            .data(this.nodes, d => d.id);

        // Remove old nodes
        this.nodeElements.exit().remove();

        // Create new nodes
        const nodeEnter = this.nodeElements
            .enter()
            .append('g')
            .attr('class', d => `node category-${d.category}`)
            .call(this.drag());

        nodeEnter.append('circle')
            .attr('r', this.settings.nodeRadius)
            .attr('fill', d => this.getNodeColor(d.category));

        // Merge and update
        this.nodeElements = nodeEnter.merge(this.nodeElements);

        // Add event listeners
        this.nodeElements
            .on('click', (event, d) => {
                event.stopPropagation();
                this.selectNode(d);
            })
            .on('mouseover', (event, d) => {
                if (this.app.settings.showTooltips) {
                    this.showTooltip(event, d);
                }
                this.highlightConnections(d);
            })
            .on('mouseout', (event, d) => {
                this.hideTooltip();
                this.clearHighlight();
            });
    }

    renderLinks() {
        this.linkElements = this.linkGroup
            .selectAll('.link')
            .data(this.links);

        // Remove old links
        this.linkElements.exit().remove();

        // Create new links
        const linkEnter = this.linkElements
            .enter()
            .append('line')
            .attr('class', d => `link ${d.type}`)
            .attr('stroke-width', d => this.getLinkWidth(d.type));

        // Merge and update
        this.linkElements = linkEnter.merge(this.linkElements);
    }

    renderLabels() {
        this.labelElements = this.labelGroup
            .selectAll('.label')
            .data(this.nodes, d => d.id);

        // Remove old labels
        this.labelElements.exit().remove();

        // Create new labels
        const labelEnter = this.labelElements
            .enter()
            .append('text')
            .attr('class', 'label')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .text(d => d.name);

        // Merge and update
        this.labelElements = labelEnter.merge(this.labelElements);
    }

    tick() {
        if (this.linkElements) {
            this.linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
        }

        if (this.nodeElements) {
            this.nodeElements
                .attr('transform', d => `translate(${d.x},${d.y})`);
        }

        if (this.labelElements) {
            this.labelElements
                .attr('x', d => d.x)
                .attr('y', d => d.y + this.settings.nodeRadius + 15);
        }
    }

    drag() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }

    selectNode(node) {
        // Clear previous selection
        this.nodeElements.classed('selected', false);
        
        // Select current node
        this.nodeElements
            .filter(d => d.id === node.id)
            .classed('selected', true);

        // Update app state
        this.app.selectConcept(node.name);
    }

    highlightNode(conceptName) {
        if (!this.nodeElements) return;

        // Clear previous highlights
        this.clearHighlight();

        // Find and highlight the node
        const node = this.nodes.find(n => n.name === conceptName);
        if (node) {
            this.nodeElements
                .filter(d => d.id === node.id)
                .classed('highlighted', true);

            // Center on the node
            this.centerOnNode(node);
        }
    }

    highlightConnections(node) {
        if (!this.nodeElements || !this.linkElements) return;

        // Get connected nodes
        const connectedNodes = new Set();
        this.links.forEach(link => {
            if (link.source.id === node.id) {
                connectedNodes.add(link.target.id);
            } else if (link.target.id === node.id) {
                connectedNodes.add(link.source.id);
            }
        });

        // Dim all nodes and links
        this.nodeElements.classed('dimmed', d => d.id !== node.id && !connectedNodes.has(d.id));
        this.linkElements.classed('dimmed', d => d.source.id !== node.id && d.target.id !== node.id);

        // Highlight connected links
        this.linkElements.classed('highlighted', d => d.source.id === node.id || d.target.id === node.id);
    }

    clearHighlight() {
        if (this.nodeElements) {
            this.nodeElements.classed('dimmed', false).classed('highlighted', false);
        }
        if (this.linkElements) {
            this.linkElements.classed('dimmed', false).classed('highlighted', false);
        }
    }

    showTooltip(event, node) {
        const definition = node.definitions && node.definitions[0] ? 
            node.definitions[0].substring(0, 150) + '...' : 
            'No definition available';

        this.tooltip
            .style('opacity', 1)
            .html(`
                <h4>${node.name}</h4>
                <p>${definition}</p>
                <div class="tooltip-meta">
                    <span>${node.category}</span>
                    <span>${node.metadata.views} views</span>
                </div>
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    hideTooltip() {
        this.tooltip.style('opacity', 0);
    }

    centerOnNode(node) {
        const scale = this.transform.k;
        const x = -node.x * scale + this.width / 2;
        const y = -node.y * scale + this.height / 2;

        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
    }

    centerView() {
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity);
    }

    zoomIn() {
        this.svg.transition()
            .duration(300)
            .call(this.zoom.scaleBy, 1.5);
    }

    zoomOut() {
        this.svg.transition()
            .duration(300)
            .call(this.zoom.scaleBy, 1 / 1.5);
    }

    changeLayout(layoutType) {
        switch (layoutType) {
            case 'force':
                this.applyForceLayout();
                break;
            case 'hierarchical':
                this.applyHierarchicalLayout();
                break;
            case 'circular':
                this.applyCircularLayout();
                break;
            case 'grid':
                this.applyGridLayout();
                break;
        }
    }

    applyForceLayout() {
        this.simulation
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('charge', d3.forceManyBody().strength(this.settings.chargeStrength))
            .alpha(1)
            .restart();
    }

    applyHierarchicalLayout() {
        // Create hierarchy based on parent-child relationships
        const hierarchy = this.createHierarchy();
        const treeLayout = d3.tree().size([this.width - 100, this.height - 100]);
        const root = treeLayout(hierarchy);

        // Position nodes
        root.descendants().forEach(d => {
            if (d.data.node) {
                d.data.node.fx = d.x + 50;
                d.data.node.fy = d.y + 50;
            }
        });

        this.simulation.alpha(0.3).restart();
    }

    applyCircularLayout() {
        const radius = Math.min(this.width, this.height) / 2 - 100;
        const angleStep = (2 * Math.PI) / this.nodes.length;

        this.nodes.forEach((node, i) => {
            const angle = i * angleStep;
            node.fx = this.width / 2 + radius * Math.cos(angle);
            node.fy = this.height / 2 + radius * Math.sin(angle);
        });

        this.simulation.alpha(0.3).restart();
    }

    applyGridLayout() {
        const cols = Math.ceil(Math.sqrt(this.nodes.length));
        const cellWidth = this.width / cols;
        const cellHeight = this.height / Math.ceil(this.nodes.length / cols);

        this.nodes.forEach((node, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            node.fx = col * cellWidth + cellWidth / 2;
            node.fy = row * cellHeight + cellHeight / 2;
        });

        this.simulation.alpha(0.3).restart();
    }

    createHierarchy() {
        // Find root nodes (nodes with no parents)
        const rootNodes = this.nodes.filter(node => {
            return !this.links.some(link => 
                link.type === 'parent-child' && link.target.id === node.id
            );
        });

        if (rootNodes.length === 0) {
            // If no clear hierarchy, use the first node as root
            rootNodes.push(this.nodes[0]);
        }

        // Build hierarchy structure
        const buildChildren = (node) => {
            const children = this.links
                .filter(link => link.type === 'parent-child' && link.source.id === node.id)
                .map(link => ({
                    node: link.target,
                    children: buildChildren(link.target)
                }));
            return children;
        };

        const hierarchyData = {
            node: rootNodes[0],
            children: buildChildren(rootNodes[0])
        };

        return d3.hierarchy(hierarchyData);
    }

    updateNodeSizes() {
        if (this.nodeElements) {
            this.nodeElements.select('circle')
                .transition()
                .duration(300)
                .attr('r', this.settings.nodeRadius);
        }
    }

    getNodeColor(category) {
        const colors = {
            technology: '#3b82f6',
            science: '#10b981',
            mathematics: '#8b5cf6',
            arts: '#f59e0b',
            business: '#ef4444',
            philosophy: '#6366f1',
            general: '#64748b'
        };
        return colors[category] || colors.general;
    }

    getLinkWidth(type) {
        const widths = {
            'parent-child': 2,
            'sibling': 1.5,
            'related': 1
        };
        return widths[type] || 1;
    }

    handleResize() {
        const container = document.getElementById('graph-canvas');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        this.svg
            .attr('width', this.width)
            .attr('height', this.height);

        this.simulation
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .alpha(0.3)
            .restart();
    }

    exportPNG() {
        const svgElement = this.svg.node();
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        canvas.width = this.width;
        canvas.height = this.height;
        
        img.onload = () => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
                this.app.downloadBlob(blob, 'knowledge-graph.png');
                this.app.showToast('Graph exported as PNG', 'success');
            });
        };
        
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        img.src = url;
    }

    exportSVG() {
        const svgElement = this.svg.node();
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        this.app.downloadBlob(blob, 'knowledge-graph.svg');
        this.app.showToast('Graph exported as SVG', 'success');
    }

    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        if (this.tooltip) {
            this.tooltip.remove();
        }
    }
}

