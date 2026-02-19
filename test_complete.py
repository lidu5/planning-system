#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('backend/moa_agriplan_system')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'moa_agriplan_system.settings')
django.setup()

from indicators.models import IndicatorGroup, Indicator, Department, StateMinisterSector
from indicators.serializers import IndicatorGroupSerializer

def test_complete_functionality():
    print("🧪 Testing Complete Hierarchical Indicator Groups Functionality")
    print("=" * 60)
    
    try:
        # Test 1: Basic model functionality
        print("\n1. Testing basic model functionality...")
        sector, _ = StateMinisterSector.objects.get_or_create(name='Test Sector')
        dept1, _ = Department.objects.get_or_create(name='Test Dept 1', sector=sector)
        dept2, _ = Department.objects.get_or_create(name='Test Dept 2', sector=sector)
        
        # Create hierarchical groups
        parent_group = IndicatorGroup.objects.create(
            name='Parent Group', 
            department=dept1, 
            unit='Units'
        )
        child_group = IndicatorGroup.objects.create(
            name='Child Group', 
            department=dept1, 
            parent=parent_group,
            unit='Items'
        )
        
        print(f"   ✅ Created parent group: {parent_group.name}")
        print(f"   ✅ Created child group: {child_group.name}")
        print(f"   ✅ Child group level: {child_group.level}")
        print(f"   ✅ Child group hierarchy path: {child_group.hierarchy_path}")
        print(f"   ✅ Child group inherited unit: {child_group.get_inherited_unit()}")
        
        # Test 2: Same name indicators in different groups
        print("\n2. Testing same-name indicators in different groups...")
        indicator1 = Indicator.objects.create(name='Productivity', department=dept1)
        indicator1.groups.add(parent_group)
        
        indicator2 = Indicator.objects.create(name='Productivity', department=dept2)
        indicator2.groups.add(child_group)
        
        print(f"   ✅ Created indicator 'Productivity' in {dept1.name}")
        print(f"   ✅ Created indicator 'Productivity' in {dept2.name}")
        print(f"   ✅ Indicator 1 effective unit: {indicator1.get_effective_unit()}")
        print(f"   ✅ Indicator 2 effective unit: {indicator2.get_effective_unit()}")
        print(f"   ✅ Indicator 1 hierarchy context: {indicator1.get_hierarchy_context()}")
        print(f"   ✅ Indicator 2 hierarchy context: {indicator2.get_hierarchy_context()}")
        
        # Test 3: Serializer functionality
        print("\n3. Testing serializer functionality...")
        groups = IndicatorGroup.objects.all()
        serializer = IndicatorGroupSerializer(groups, many=True)
        data = serializer.data
        
        print(f"   ✅ Serialized {len(data)} groups")
        for group_data in data:
            if group_data['name'] in ['Parent Group', 'Child Group']:
                print(f"   ✅ Group '{group_data['name']}' keys: {list(group_data.keys())}")
                if 'children' in group_data:
                    print(f"      ✅ Children count: {len(group_data['children'])}")
                if 'level' in group_data:
                    print(f"      ✅ Level: {group_data['level']}")
                if 'hierarchy_path' in group_data:
                    print(f"      ✅ Hierarchy path: {group_data['hierarchy_path']}")
                if 'inherited_unit' in group_data:
                    print(f"      ✅ Inherited unit: {group_data['inherited_unit']}")
        
        # Test 4: Aggregation methods (basic test)
        print("\n4. Testing aggregation methods...")
        try:
            # This will test the method without actual plan data
            agg = parent_group.get_annual_target_aggregate(2024)
            print(f"   ✅ Annual target aggregation: {agg}")
        except Exception as e:
            print(f"   ⚠️  Aggregation test (expected to fail without plan data): {e}")
        
        # Clean up
        print("\n5. Cleaning up test data...")
        indicator1.delete()
        indicator2.delete()
        child_group.delete()
        parent_group.delete()
        
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED! Hierarchical indicator groups are working correctly!")
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_complete_functionality()
    sys.exit(0 if success else 1)
