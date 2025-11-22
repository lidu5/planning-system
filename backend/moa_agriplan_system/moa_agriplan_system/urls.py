"""
URL configuration for moa_agriplan_system project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from indicators.views import SectorViewSet, DepartmentViewSet, IndicatorViewSet
from users.views import MeView, UserViewSet, AdminStatsView, AdminTargetsBySectorView, AdminIndicatorsByDepartmentView
from plans.views import (
    AnnualPlanViewSet,
    QuarterlyBreakdownViewSet,
    QuarterlyPerformanceViewSet,
    FileAttachmentViewSet,
    SubmissionWindowViewSet,
)

router = DefaultRouter()
router.register(r'api/sectors', SectorViewSet, basename='sector')
router.register(r'api/departments', DepartmentViewSet, basename='department')
router.register(r'api/indicators', IndicatorViewSet, basename='indicator')
router.register(r'api/annual-plans', AnnualPlanViewSet, basename='annualplan')
router.register(r'api/breakdowns', QuarterlyBreakdownViewSet, basename='breakdown')
router.register(r'api/performances', QuarterlyPerformanceViewSet, basename='performance')
router.register(r'api/attachments', FileAttachmentViewSet, basename='attachment')
router.register(r'api/users', UserViewSet, basename='user')
router.register(r'api/submission-windows', SubmissionWindowViewSet, basename='submissionwindow')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/token/', obtain_auth_token, name='api-token'),
    path('api/me/', MeView.as_view(), name='api-me'),
    path('api/admin-stats/', AdminStatsView.as_view(), name='api-admin-stats'),
    path('api/admin-stats/targets-by-sector/', AdminTargetsBySectorView.as_view(), name='api-admin-targets-by-sector'),
    path('api/admin-stats/indicators-by-department/', AdminIndicatorsByDepartmentView.as_view(), name='api-admin-indicators-by-department'),
    path('', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
