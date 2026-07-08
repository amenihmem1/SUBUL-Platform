#!/usr/bin/env python3
"""
Test des optimisations du roadmap agent
"""

import asyncio
import json
import time
import sys
import os

# Ajouter le chemin de l'agent
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from roadmap_agent import RoadmapBrainAgent

async def test_optimizations():
    print("🧪 Test des optimisations Roadmap Agent\n")
    
    # Initialiser l'agent
    brain = RoadmapBrainAgent()
    await brain.setup()
    
    agent = brain.get_roadmap_agent()
    
    # Test 1: Cache RAG
    print("\n1️⃣ Test Cache RAG...")
    start_time = time.time()
    
    # Premier appel (cache miss)
    print("   🔍 Premier appel (cache miss attendu)")
    # Simuler l'appel interne de recherche
    search_query = "Azure AZ-900 AZ-104 AWS Cloud Practitioner"
    try:
        result1 = await agent._search.search_cached(search_query, top_k=5)
        first_call_time = time.time() - start_time
        print(f"   ⏱️  Durée: {first_call_time:.2f}s")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return
    
    # Deuxième appel (cache hit)
    start_time = time.time()
    print("   🚀 Deuxième appel (cache hit attendu)")
    try:
        result2 = await agent._search.search_cached(search_query, top_k=5)
        second_call_time = time.time() - start_time
        print(f"   ⏱️  Durée: {second_call_time:.2f}s")
        
        if second_call_time < first_call_time * 0.5:
            print(f"   ✅ Cache fonctionne! {second_call_time:.2f}s vs {first_call_time:.2f}s")
        else:
            print(f"   ⚠️  Cache peut ne pas fonctionner correctement")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Test 2: Fallback templates
    print("\n2️⃣ Test Templates Fallback...")
    
    test_cases = [
        {"profile": "cloud", "niveau": "Débutant"},
        {"profile": "cyber", "niveau": "Débutant"},
        {"profile": "ai", "niveau": "Débutant"}
    ]
    
    for case in test_cases:
        profile = case["profile"]
        niveau = case["niveau"]
        key = f"{profile}_{niveau.lower()}"
        
        if key in agent.__class__.__dict__.get('ROADMAP_TEMPLATES', {}):
            template = agent.__class__.__dict__['ROADMAP_TEMPLATES'][key]
            print(f"   ✅ Template trouvé pour {profile}/{niveau}: {template['roadmap_title']}")
        else:
            print(f"   ❌ Template manquant pour {profile}/{niveau}")
    
    # Test 3: Génération avec timeout
    print("\n3️⃣ Test Génération avec Timeout...")
    
    test_data = {
        "profile": "cloud",
        "niveau": "Débutant", 
        "profile_data": {
            "profile": "cloud",
            "confidence": 0.8,
            "scores": {"cloud": 80, "cyber": 60, "ai": 40},
            "strengths": ["System Architecture"],
            "recommended_first_certification": "AZ-900"
        },
        "level_data": {
            "niveau": "Débutant",
            "score": {"obtenu": 12, "total": 20, "pourcentage": 60},
            "points_forts": ["Concepts Cloud"],
            "points_a_renforcer": ["Services Avancés"]
        }
    }
    
    start_time = time.time()
    chunk_count = 0
    
    try:
        print("   🚀 Démarrage génération (max 30s)...")
        async for chunk in agent.generate_roadmap(
            profile=test_data["profile"],
            niveau=test_data["niveau"],
            profile_data=test_data["profile_data"],
            level_data=test_data["level_data"],
            user_id="test_user",
            session_id="test_session",
            lang="fr"
        ):
            chunk_data = json.loads(chunk)
            if chunk_data.get("status") == "streaming":
                chunk_count += 1
                if chunk_count <= 3:  # Afficher premiers chunks
                    print(f"   📦 Chunk {chunk_count}: {chunk_data.get('chunk', '')[:50]}...")
            elif chunk_data.get("status") == "completed":
                break
        
        total_time = time.time() - start_time
        print(f"   ✅ Génération terminée en {total_time:.2f}s ({chunk_count} chunks)")
        
        if total_time < 30:
            print(f"   🎯 Performance OK: {total_time:.2f}s < 30s")
        else:
            print(f"   ⚠️  Performance lente: {total_time:.2f}s > 30s")
            
    except asyncio.TimeoutError:
        total_time = time.time() - start_time
        print(f"   ⏰ Timeout après {total_time:.2f}s (fallback utilisé)")
    except Exception as e:
        total_time = time.time() - start_time
        print(f"   ❌ Erreur après {total_time:.2f}s: {e}")
    
    print("\n🎉 Test terminé!")

if __name__ == "__main__":
    asyncio.run(test_optimizations())
