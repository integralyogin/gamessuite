from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
import json
import os
from datetime import datetime
import uuid

knowledge_bp = Blueprint('knowledge', __name__)

# In-memory storage for the knowledge base (in production, this would be a database)
knowledge_base = {}
analytics_data = {
    'total_views': 0,
    'popular_concepts': {},
    'search_queries': [],
    'daily_stats': {}
}

def load_knowledge_base():
    """Load knowledge base from JSON file"""
    global knowledge_base
    try:
        # Try to load from the frontend data directory first
        frontend_path = '/home/ubuntu/knowledge-explorer-enhanced-vanilla/data/knowledge_base.json'
        if os.path.exists(frontend_path):
            with open(frontend_path, 'r') as f:
                knowledge_base = json.load(f)
                print(f"✅ Loaded knowledge base from {frontend_path}")
                return True
        
        # Fallback to local data directory
        local_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'knowledge_base.json')
        if os.path.exists(local_path):
            with open(local_path, 'r') as f:
                knowledge_base = json.load(f)
                print(f"✅ Loaded knowledge base from {local_path}")
                return True
                
        print("⚠️ No knowledge base file found, using empty knowledge base")
        return False
    except Exception as e:
        print(f"❌ Error loading knowledge base: {e}")
        return False

def save_knowledge_base():
    """Save knowledge base to JSON file"""
    try:
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        os.makedirs(data_dir, exist_ok=True)
        
        file_path = os.path.join(data_dir, 'knowledge_base.json')
        with open(file_path, 'w') as f:
            json.dump(knowledge_base, f, indent=2)
        
        # Also update the frontend data
        frontend_path = '/home/ubuntu/knowledge-explorer-enhanced-vanilla/data/knowledge_base.json'
        if os.path.exists(os.path.dirname(frontend_path)):
            with open(frontend_path, 'w') as f:
                json.dump(knowledge_base, f, indent=2)
        
        return True
    except Exception as e:
        print(f"❌ Error saving knowledge base: {e}")
        return False

def update_analytics(concept_name, action='view'):
    """Update analytics data"""
    global analytics_data
    
    if action == 'view':
        analytics_data['total_views'] += 1
        if concept_name in analytics_data['popular_concepts']:
            analytics_data['popular_concepts'][concept_name] += 1
        else:
            analytics_data['popular_concepts'][concept_name] = 1
    
    # Update daily stats
    today = datetime.now().strftime('%Y-%m-%d')
    if today not in analytics_data['daily_stats']:
        analytics_data['daily_stats'][today] = {'views': 0, 'searches': 0}
    
    if action == 'view':
        analytics_data['daily_stats'][today]['views'] += 1
    elif action == 'search':
        analytics_data['daily_stats'][today]['searches'] += 1

@knowledge_bp.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'concepts_count': len(knowledge_base),
        'total_views': analytics_data['total_views']
    })

@knowledge_bp.route('/concepts', methods=['GET'])
@cross_origin()
def get_all_concepts():
    """Get all concepts in the knowledge base"""
    try:
        # Add view tracking
        update_analytics('all_concepts', 'view')
        
        return jsonify({
            'success': True,
            'data': knowledge_base,
            'count': len(knowledge_base),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@knowledge_bp.route('/concepts/<concept_name>', methods=['GET'])
@cross_origin()
def get_concept(concept_name):
    """Get a specific concept"""
    try:
        if concept_name not in knowledge_base:
            return jsonify({
                'success': False,
                'error': 'Concept not found'
            }), 404
        
        # Update analytics
        update_analytics(concept_name, 'view')
        
        # Update metadata
        concept = knowledge_base[concept_name].copy()
        if 'metadata' not in concept:
            concept['metadata'] = {}
        concept['metadata']['views'] = concept['metadata'].get('views', 0) + 1
        concept['metadata']['last_accessed'] = datetime.now().isoformat()
        
        # Update the knowledge base
        knowledge_base[concept_name]['metadata'] = concept['metadata']
        
        return jsonify({
            'success': True,
            'data': concept,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@knowledge_bp.route('/concepts', methods=['POST'])
@cross_origin()
def add_concept():
    """Add a new concept"""
    try:
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({
                'success': False,
                'error': 'Concept name is required'
            }), 400
        
        concept_name = data['name']
        
        if concept_name in knowledge_base:
            return jsonify({
                'success': False,
                'error': 'Concept already exists'
            }), 409
        
        # Create new concept
        new_concept = {
            'definitions': data.get('definitions', []),
            'parents': data.get('parents', []),
            'children': data.get('children', []),
            'siblings': data.get('siblings', []),
            'category': data.get('category', 'general'),
            'tags': data.get('tags', []),
            'examples': data.get('examples', []),
            'metadata': {
                'created': datetime.now().isoformat(),
                'updated': datetime.now().isoformat(),
                'views': 0,
                'difficulty': data.get('difficulty', 1),
                'popularity': 0.0,
                'id': str(uuid.uuid4())
            }
        }
        
        knowledge_base[concept_name] = new_concept
        save_knowledge_base()
        
        return jsonify({
            'success': True,
            'data': new_concept,
            'message': f'Concept "{concept_name}" added successfully'
        }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@knowledge_bp.route('/concepts/<concept_name>', methods=['PUT'])
@cross_origin()
def update_concept(concept_name):
    """Update an existing concept"""
    try:
        if concept_name not in knowledge_base:
            return jsonify({
                'success': False,
                'error': 'Concept not found'
            }), 404
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Update concept
        concept = knowledge_base[concept_name]
        
        # Update fields if provided
        if 'definitions' in data:
            concept['definitions'] = data['definitions']
        if 'parents' in data:
            concept['parents'] = data['parents']
        if 'children' in data:
            concept['children'] = data['children']
        if 'siblings' in data:
            concept['siblings'] = data['siblings']
        if 'category' in data:
            concept['category'] = data['category']
        if 'tags' in data:
            concept['tags'] = data['tags']
        if 'examples' in data:
            concept['examples'] = data['examples']
        
        # Update metadata
        concept['metadata']['updated'] = datetime.now().isoformat()
        
        save_knowledge_base()
        
        return jsonify({
            'success': True,
            'data': concept,
            'message': f'Concept "{concept_name}" updated successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@knowledge_bp.route('/concepts/<concept_name>', methods=['DELETE'])
@cross_origin()
def delete_concept(concept_name):
    """Delete a concept"""
    try:
        if concept_name not in knowledge_base:
            return jsonify({
                'success': False,
                'error': 'Concept not found'
            }), 404
        
        # Remove concept
        del knowledge_base[concept_name]
        
        # Remove references from other concepts
        for name, concept in knowledge_base.items():
            if concept_name in concept.get('parents', []):
                concept['parents'].remove(concept_name)
            if concept_name in concept.get('children', []):
                concept['children'].remove(concept_name)
            if concept_name in concept.get('siblings', []):
                concept['siblings'].remove(concept_name)
        
        save_knowledge_base()
        
        return jsonify({
            'success': True,
            'message': f'Concept "{concept_name}" deleted successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@knowledge_bp.route('/search', methods=['GET'])
@cross_origin()
def search_concepts():
    """Search for concepts"""
    try:
        query = request.args.get('q', '').strip().lower()
        category = request.args.get('category', '')
        limit = int(request.args.get('limit', 20))
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Search query is required'
            }), 400
        
        # Track search
        analytics_data['search_queries'].append({
            'query': query,
            'timestamp': datetime.now().isoformat()
        })
        update_analytics(query, 'search')
        
        results = []
        
        for name, concept in knowledge_base.items():
            score = 0
            match_type = None
            
            # Exact match
            if name.lower() == query:
                score = 100
                match_type = 'exact'
            # Starts with
            elif name.lower().startswith(query):
                score = 90
                match_type = 'starts_with'
            # Contains
            elif query in name.lower():
                score = 70
                match_type = 'contains'
            # Definition match
            elif any(query in def_text.lower() for def_text in concept.get('definitions', [])):
                score = 50
                match_type = 'definition'
            # Tag match
            elif any(query in tag.lower() for tag in concept.get('tags', [])):
                score = 40
                match_type = 'tag'
            
            # Category filter
            if category and concept.get('category', '') != category:
                continue
            
            if score > 0:
                results.append({
                    'name': name,
                    'concept': concept,
                    'score': score,
                    'match_type': match_type
                })
        
        # Sort by score
        results.sort(key=lambda x: x['score'], reverse=True)
        results = results[:limit]
        
        return jsonify({
            'success': True,
            'data': results,
            'query': query,
            'count': len(results),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@knowledge_bp.route('/suggestions', methods=['GET'])
@cross_origin()
def get_suggestions():
    """Get concept suggestions for autocomplete"""
    try:
        query = request.args.get('q', '').strip().lower()
        limit = int(request.args.get('limit', 10))
        
        if not query:
            return jsonify({
                'success': True,
                'data': [],
                'count': 0
            })
        
        suggestions = []
        
        for name in knowledge_base.keys():
            if query in name.lower():
                suggestions.append({
                    'name': name,
                    'category': knowledge_base[name].get('category', 'general')
                })
        
        # Sort by relevance (starts with query first)
        suggestions.sort(key=lambda x: (
            not x['name'].lower().startswith(query),
            x['name'].lower()
        ))
        
        suggestions = suggestions[:limit]
        
        return jsonify({
            'success': True,
            'data': suggestions,
            'count': len(suggestions)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@knowledge_bp.route('/related/<concept_name>', methods=['GET'])
@cross_origin()
def get_related_concepts(concept_name):
    """Get related concepts"""
    try:
        if concept_name not in knowledge_base:
            return jsonify({
                'success': False,
                'error': 'Concept not found'
            }), 404
        
        concept = knowledge_base[concept_name]
        limit = int(request.args.get('limit', 10))
        
        related = []
        
        # Add parents, children, and siblings
        for rel_name in (concept.get('parents', []) + 
                        concept.get('children', []) + 
                        concept.get('siblings', [])):
            if rel_name in knowledge_base:
                related.append({
                    'name': rel_name,
                    'concept': knowledge_base[rel_name],
                    'relationship': 'direct'
                })
        
        # Add concepts with similar tags
        concept_tags = set(concept.get('tags', []))
        for name, other_concept in knowledge_base.items():
            if name != concept_name and name not in [r['name'] for r in related]:
                other_tags = set(other_concept.get('tags', []))
                if concept_tags & other_tags:  # Intersection
                    related.append({
                        'name': name,
                        'concept': other_concept,
                        'relationship': 'similar_tags'
                    })
        
        # Limit results
        related = related[:limit]
        
        return jsonify({
            'success': True,
            'data': related,
            'count': len(related)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@knowledge_bp.route('/analytics', methods=['GET'])
@cross_origin()
def get_analytics():
    """Get analytics data"""
    try:
        time_range = request.args.get('range', '7d')
        
        # Calculate popular concepts
        popular = sorted(
            analytics_data['popular_concepts'].items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        # Recent searches
        recent_searches = analytics_data['search_queries'][-20:]
        
        return jsonify({
            'success': True,
            'data': {
                'total_views': analytics_data['total_views'],
                'total_concepts': len(knowledge_base),
                'popular_concepts': popular,
                'recent_searches': recent_searches,
                'daily_stats': analytics_data['daily_stats']
            },
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@knowledge_bp.route('/export', methods=['GET'])
@cross_origin()
def export_data():
    """Export knowledge base data"""
    try:
        format_type = request.args.get('format', 'json')
        
        if format_type == 'json':
            return jsonify({
                'success': True,
                'data': {
                    'knowledge_base': knowledge_base,
                    'analytics': analytics_data,
                    'exported_at': datetime.now().isoformat(),
                    'version': '1.0.0'
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported format: {format_type}'
            }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@knowledge_bp.route('/import', methods=['POST'])
@cross_origin()
def import_data():
    """Import knowledge base data"""
    try:
        data = request.get_json()
        
        if not data or 'data' not in data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        import_data = data['data']
        
        if 'knowledge_base' in import_data:
            global knowledge_base
            knowledge_base.update(import_data['knowledge_base'])
            save_knowledge_base()
        
        return jsonify({
            'success': True,
            'message': 'Data imported successfully',
            'concepts_imported': len(import_data.get('knowledge_base', {}))
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Initialize knowledge base on module load
load_knowledge_base()

