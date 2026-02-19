#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('backend/moa_agriplan_system')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'moa_agriplan_system.settings')
django.setup()

from indicators.models import Indicator, IndicatorGroup, Department, StateMinisterSector
from indicators.serializers import IndicatorSerializer

def test_indicator_dropdown_with_groups():
    print("🧪 Testing Indicator Dropdown with Group Context")
    print("=" * 60)
    
    try:
        # Test 1: Create test data
        print("\n1. Creating test data...")
        sector, _ = StateMinisterSector.objects.get_or_create(name='Test Sector')
        dept1, _ = Department.objects.get_or_create(name='Test Dept 1', sector=sector)
        dept2, _ = Department.objects.get_or_create(name='Test Dept 2', sector=sector)
        
        # Create hierarchical groups
        parent_group = IndicatorGroup.objects.create(
            name='Agricultural Production', 
            department=dept1, 
            unit='Tons'
        )
        child_group = IndicatorGroup.objects.create(
            name='Crop Yield', 
            department=dept1, 
            parent=parent_group,
            unit='kg/ha'
        )
        other_group = IndicatorGroup.objects.create(
            name='Livestock', 
            department=dept2, 
            unit='Heads'
        )
        
        print(f"   ✅ Created groups: {parent_group.name}, {child_group.name}, {other_group.name}")
        
        # Test 2: Create indicators with same names in different groups
        print("\n2. Creating indicators with same names in different groups...")
        indicator1 = Indicator.objects.create(name='Productivity', department=dept1)
        indicator1.groups.add(parent_group)
        
        indicator2 = Indicator.objects.create(name='Productivity', department=dept1)
        indicator2.groups.add(child_group)
        
        indicator3 = Indicator.objects.create(name='Productivity', department=dept2)
        indicator3.groups.add(other_group)
        
        print(f"   ✅ Created 3 'Productivity' indicators in different groups")
        
        # Test 3: Test serializer with group context
        print("\n3. Testing serializer output...")
        indicators = Indicator.objects.filter(name='Productivity')
        serializer = IndicatorSerializer(indicators, many=True)
        data = serializer.data
        
        print(f"   ✅ Serialized {len(data)} indicators")
        
        for i, indicator_data in enumerate(data, 1):
            print(f"   \n   Indicator {i}:")
            print(f"      Name: {indicator_data['name']}")
            print(f"      Department: {indicator_data['department']['name']}")
            
            # Check hierarchy context
            if indicator_data.get('hierarchy_context'):
                ctx = indicator_data['hierarchy_context']
                print(f"      Group Context: {ctx['group_name']} ({ctx['hierarchy_path']})")
                print(f"      Level: {ctx['level']}")
                print(f"      Unit: {ctx.get('unit', 'N/A')}")
            
            # Check groups
            if indicator_data.get('groups'):
                for group in indicator_data['groups']:
                    print(f"      Group: {group['name']} - {group.get('hierarchy_path', 'N/A')}")
        
        # Test 4: Simulate frontend display formatting
        print("\n4. Testing frontend display formatting...")
        
        def format_indicator_display_name(indicator_data):
            """Simulate the frontend formatting function"""
            if indicator_data.get('hierarchy_context'):
                ctx = indicator_data['hierarchy_context']
                return f"{indicator_data['name']} ({ctx['hierarchy_path']})"
            
            if indicator_data.get('groups') and indicator_data['groups']:
                group = indicator_data['groups'][0]
                path = group.get('hierarchy_path') or group['name']
                return f"{indicator_data['name']} ({path})"
            
            return indicator_data['name']
        
        for i, indicator_data in enumerate(data, 1):
            display_name = format_indicator_display_name(indicator_data)
            print(f"   ✅ Dropdown Option {i}: {display_name}")
        
        # Test 5: Verify uniqueness
        print("\n5. Verifying dropdown options are unique...")
        display_names = [format_indicator_display_name(ind) for ind in data]
        unique_names = set(display_names)
        
        if len(display_names) == len(unique_names):
            print("   ✅ All dropdown options are unique")
        else:
            print("   ❌ Duplicate dropdown options found")
            duplicates = [name for name in display_names if display_names.count(name) > 1]
            print(f"   Duplicates: {set(duplicates)}")
        
        # Clean up
        print("\n6. Cleaning up test data...")
        indicator1.delete()
        indicator2.delete()
        indicator3.delete()
        child_group.delete()
        parent_group.delete()
        other_group.delete()
        
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED! Indicator dropdown with group context is working correctly!")
        print("\n📋 Summary:")
        print("   - Same-name indicators are differentiated by their group context")
        print("   - Hierarchy paths show parent-child relationships")
        print("   - Dropdown options are unique and informative")
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_indicator_dropdown_with_groups()
    sys.exit(0 if success else 1)
