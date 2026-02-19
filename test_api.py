#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('backend/moa_agriplan_system')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'moa_agriplan_system.settings')
django.setup()

from indicators.models import IndicatorGroup
from indicators.serializers import IndicatorGroupSerializer

def test_api():
    try:
        # Test model
        groups = IndicatorGroup.objects.all()
        print(f"Found {groups.count()} indicator groups in database")
        
        # Test serializer
        serializer = IndicatorGroupSerializer(groups[:3], many=True)
        data = serializer.data
        print("Serializer test passed!")
        print(f"Sample data keys: {list(data[0].keys()) if data else 'No data'}")
        
        # Test individual fields
        if data:
            group = data[0]
            print(f"Group ID: {group.get('id')}")
            print(f"Group name: {group.get('name')}")
            print(f"Department: {group.get('department', {}).get('name', 'N/A')}")
            print(f"Unit: {group.get('unit', 'N/A')}")
            print(f"Parent: {group.get('parent')}")
            print(f"Level: {group.get('level')}")
            print(f"Hierarchy path: {group.get('hierarchy_path')}")
            print(f"Is parent: {group.get('is_parent')}")
            print(f"Inherited unit: {group.get('inherited_unit')}")
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_api()
    if success:
        print("\n✅ API test completed successfully!")
    else:
        print("\n❌ API test failed!")
