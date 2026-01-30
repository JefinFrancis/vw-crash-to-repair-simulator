"""
Damage assessment Pydantic schemas for VW crash-to-repair simulator.

Provides data validation and serialization for crash analysis, damage assessment,
and repair cost calculations integrated with BeamNG.drive simulation.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum
import uuid


class DamageType(str, Enum):
    """Standard damage type classifications."""
    COSMETIC = "cosmetic"
    STRUCTURAL = "structural"
    MECHANICAL = "mechanical"
    ELECTRICAL = "electrical"
    SAFETY_SYSTEM = "safety_system"
    BODY_PANEL = "body_panel"
    INTERIOR = "interior"
    GLASS = "glass"


class DamageSeverity(str, Enum):
    """Damage severity levels."""
    MINOR = "minor"
    MODERATE = "moderate"
    SEVERE = "severe"
    TOTAL_LOSS = "total_loss"


class RepairComplexity(str, Enum):
    """Repair complexity classifications."""
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    SPECIALIST_REQUIRED = "specialist_required"


class DamageZone(BaseModel):
    """Vehicle damage zone information."""
    
    zone_id: str = Field(..., description="Zone identifier (e.g., 'front-left', 'roof')")
    zone_name: str = Field(..., description="Human-readable zone name")
    affected_components: List[str] = Field(..., description="List of affected components")
    damage_percentage: float = Field(..., ge=0, le=100, description="Damage percentage in this zone")
    repair_priority: int = Field(..., ge=1, le=10, description="Repair priority (1=highest)")
    access_difficulty: str = Field("normal", description="Access difficulty for repairs")
    
    @validator('access_difficulty')
    def validate_access_difficulty(cls, v):
        """Validate access difficulty level."""
        valid_levels = ['easy', 'normal', 'difficult', 'very_difficult']
        if v.lower() not in valid_levels:
            raise ValueError(f"Access difficulty must be one of: {', '.join(valid_levels)}")
        return v.lower()


class ComponentDamage(BaseModel):
    """Individual component damage assessment."""
    
    component_id: str = Field(..., description="Component identifier")
    component_name: str = Field(..., description="Component display name")
    part_number: Optional[str] = Field(None, description="VW part number")
    damage_type: DamageType = Field(..., description="Type of damage")
    severity: DamageSeverity = Field(..., description="Damage severity")
    damage_description: str = Field(..., description="Detailed damage description")
    repair_action: str = Field(..., description="Recommended repair action")
    repair_complexity: RepairComplexity = Field(..., description="Repair complexity")
    replacement_required: bool = Field(False, description="Whether component needs replacement")
    estimated_repair_hours: float = Field(..., ge=0, description="Estimated repair time in hours")
    estimated_cost_brl: float = Field(..., ge=0, description="Estimated cost in Brazilian Real")
    safety_critical: bool = Field(False, description="Whether component is safety-critical")
    affects_drivability: bool = Field(False, description="Whether damage affects vehicle drivability")
    
    @validator('repair_action')
    def validate_repair_action(cls, v):
        """Validate repair action type."""
        valid_actions = [
            'repair', 'replace', 'adjust', 'refinish',
            'recalibrate', 'inspect_only', 'total_loss'
        ]
        if v.lower() not in valid_actions:
            raise ValueError(f"Repair action must be one of: {', '.join(valid_actions)}")
        return v.lower()


class CrashData(BaseModel):
    """BeamNG crash simulation data."""
    
    simulation_id: str = Field(..., description="BeamNG simulation identifier")
    crash_type: str = Field(..., description="Type of crash (frontal, side, rear, rollover)")
    impact_speed_kmh: float = Field(..., ge=0, le=300, description="Impact speed in km/h")
    impact_angle_degrees: float = Field(..., ge=-180, le=180, description="Impact angle in degrees")
    impact_location: Dict[str, float] = Field(..., description="Impact coordinates on vehicle")
    deformation_energy: float = Field(..., ge=0, description="Deformation energy in Joules")
    crash_timestamp: datetime = Field(..., description="Simulation timestamp")
    environmental_factors: Dict[str, Any] = Field(default_factory=dict, description="Weather, road conditions")
    
    @validator('crash_type')
    def validate_crash_type(cls, v):
        """Validate crash type."""
        valid_types = [
            'frontal', 'side', 'rear', 'rollover', 'multiple_impact',
            'offset_frontal', 'oblique', 'underride', 'override'
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Crash type must be one of: {', '.join(valid_types)}")
        return v.lower()


class DamageAssessmentBase(BaseModel):
    """Base damage assessment model."""
    
    vehicle_vin: str = Field(..., description="Vehicle VIN")
    assessment_type: str = Field("post_crash", description="Assessment type")
    assessor_name: str = Field(..., description="Damage assessor name")
    assessment_date: datetime = Field(..., description="Assessment date and time")
    crash_data: Optional[CrashData] = Field(None, description="BeamNG crash simulation data")
    overall_severity: DamageSeverity = Field(..., description="Overall damage severity")
    total_estimated_cost_brl: float = Field(..., ge=0, description="Total estimated repair cost")
    total_estimated_hours: float = Field(..., ge=0, description="Total estimated repair time")
    vehicle_drivable: bool = Field(True, description="Whether vehicle is currently drivable")
    towing_required: bool = Field(False, description="Whether towing is required")
    
    @validator('assessment_type')
    def validate_assessment_type(cls, v):
        """Validate assessment type."""
        valid_types = [
            'post_crash', 'pre_repair', 'post_repair', 'insurance_claim',
            'routine_inspection', 'warranty_claim'
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Assessment type must be one of: {', '.join(valid_types)}")
        return v.lower()


class DamageAssessmentCreate(DamageAssessmentBase):
    """Schema for creating a new damage assessment."""
    
    damage_zones: List[DamageZone] = Field(..., description="Damaged vehicle zones")
    component_damages: List[ComponentDamage] = Field(..., description="Individual component damage")
    photos: List[Dict[str, str]] = Field(default_factory=list, description="Damage photos")
    additional_notes: Optional[str] = Field(None, max_length=2000, description="Additional assessment notes")
    customer_reported_symptoms: List[str] = Field(default_factory=list, description="Customer-reported issues")


class DamageAssessmentUpdate(BaseModel):
    """Schema for updating a damage assessment."""
    
    assessment_type: Optional[str] = None
    assessor_name: Optional[str] = None
    overall_severity: Optional[DamageSeverity] = None
    total_estimated_cost_brl: Optional[float] = Field(None, ge=0)
    total_estimated_hours: Optional[float] = Field(None, ge=0)
    vehicle_drivable: Optional[bool] = None
    towing_required: Optional[bool] = None
    damage_zones: Optional[List[DamageZone]] = None
    component_damages: Optional[List[ComponentDamage]] = None
    additional_notes: Optional[str] = Field(None, max_length=2000)


class SafetyAssessment(BaseModel):
    """Safety system assessment."""
    
    airbag_deployment: Dict[str, bool] = Field(..., description="Airbag deployment status")
    seatbelt_damage: bool = Field(False, description="Seatbelt system damage")
    structural_integrity: str = Field(..., description="Structural integrity assessment")
    safety_system_faults: List[str] = Field(default_factory=list, description="Safety system error codes")
    crash_worthiness_rating: Optional[str] = Field(None, description="Post-crash safety rating")
    occupant_protection_level: str = Field("unknown", description="Occupant protection effectiveness")
    
    @validator('structural_integrity')
    def validate_structural_integrity(cls, v):
        """Validate structural integrity assessment."""
        valid_ratings = ['excellent', 'good', 'fair', 'poor', 'compromised', 'unsafe']
        if v.lower() not in valid_ratings:
            raise ValueError(f"Structural integrity must be one of: {', '.join(valid_ratings)}")
        return v.lower()
    
    @validator('occupant_protection_level')
    def validate_protection_level(cls, v):
        """Validate occupant protection level."""
        valid_levels = ['excellent', 'good', 'adequate', 'poor', 'insufficient', 'unknown']
        if v.lower() not in valid_levels:
            raise ValueError(f"Protection level must be one of: {', '.join(valid_levels)}")
        return v.lower()


class RepairPlan(BaseModel):
    """Detailed repair execution plan."""
    
    repair_phases: List[Dict[str, Any]] = Field(..., description="Repair execution phases")
    required_parts: List[Dict[str, Any]] = Field(..., description="Required parts list")
    labor_breakdown: Dict[str, float] = Field(..., description="Labor hour breakdown by category")
    estimated_timeline_days: int = Field(..., ge=1, description="Estimated repair timeline")
    special_equipment_needed: List[str] = Field(default_factory=list, description="Special equipment requirements")
    technician_skills_required: List[str] = Field(default_factory=list, description="Required technician skills")
    quality_checkpoints: List[str] = Field(default_factory=list, description="Quality control checkpoints")
    customer_approvals_needed: List[str] = Field(default_factory=list, description="Customer approval points")


class InsuranceAssessment(BaseModel):
    """Insurance-specific assessment data."""
    
    claim_number: Optional[str] = Field(None, description="Insurance claim number")
    policy_coverage: Dict[str, Any] = Field(default_factory=dict, description="Policy coverage details")
    deductible_amount_brl: float = Field(..., ge=0, description="Insurance deductible amount")
    coverage_amount_brl: float = Field(..., ge=0, description="Covered repair amount")
    depreciation_applied: bool = Field(False, description="Whether depreciation was applied")
    total_loss_threshold_brl: float = Field(..., ge=0, description="Total loss threshold amount")
    recommended_settlement: str = Field(..., description="Recommended settlement action")
    
    @validator('recommended_settlement')
    def validate_settlement_recommendation(cls, v):
        """Validate settlement recommendation."""
        valid_recommendations = ['repair', 'total_loss', 'partial_settlement', 'deny_claim']
        if v.lower() not in valid_recommendations:
            raise ValueError(f"Settlement recommendation must be one of: {', '.join(valid_recommendations)}")
        return v.lower()


class DamageAssessmentResponse(DamageAssessmentBase):
    """Complete damage assessment response."""
    
    id: uuid.UUID = Field(..., description="Assessment unique identifier")
    assessment_number: str = Field(..., description="Human-readable assessment number")
    damage_zones: List[DamageZone] = Field(..., description="Damaged vehicle zones")
    component_damages: List[ComponentDamage] = Field(..., description="Individual component damage")
    safety_assessment: SafetyAssessment = Field(..., description="Safety system assessment")
    repair_plan: RepairPlan = Field(..., description="Detailed repair plan")
    insurance_assessment: Optional[InsuranceAssessment] = Field(None, description="Insurance assessment")
    photos: List[Dict[str, str]] = Field(default_factory=list, description="Damage photos with metadata")
    additional_notes: Optional[str] = Field(None, description="Additional assessment notes")
    customer_reported_symptoms: List[str] = Field(default_factory=list, description="Customer-reported issues")
    created_at: datetime = Field(..., description="Assessment creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v)
        }


class CrashAnalysisRequest(BaseModel):
    """Request for crash analysis from BeamNG data."""
    
    simulation_data: Dict[str, Any] = Field(..., description="BeamNG simulation data")
    vehicle_model: str = Field(..., description="Vehicle model for analysis")
    analysis_depth: str = Field("standard", description="Analysis depth level")
    include_repair_estimate: bool = Field(True, description="Include repair cost estimation")
    
    @validator('analysis_depth')
    def validate_analysis_depth(cls, v):
        """Validate analysis depth level."""
        valid_depths = ['basic', 'standard', 'detailed', 'forensic']
        if v.lower() not in valid_depths:
            raise ValueError(f"Analysis depth must be one of: {', '.join(valid_depths)}")
        return v.lower()


class CrashAnalysisResponse(BaseModel):
    """Crash analysis results from BeamNG integration."""
    
    analysis_id: uuid.UUID = Field(..., description="Analysis unique identifier")
    crash_data: CrashData = Field(..., description="Processed crash data")
    predicted_damage_zones: List[DamageZone] = Field(..., description="AI-predicted damage zones")
    confidence_score: float = Field(..., ge=0, le=1, description="Analysis confidence score")
    recommended_inspections: List[str] = Field(..., description="Recommended additional inspections")
    safety_concerns: List[str] = Field(default_factory=list, description="Identified safety concerns")
    repair_complexity_score: float = Field(..., ge=0, le=10, description="Overall repair complexity")
    estimated_total_cost_brl: float = Field(..., ge=0, description="Estimated total repair cost")
    analysis_timestamp: datetime = Field(..., description="Analysis completion timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v)
        }


class DamagePhoto(BaseModel):
    """Damage photo metadata."""
    
    photo_id: uuid.UUID = Field(..., description="Photo unique identifier")
    filename: str = Field(..., description="Original filename")
    file_path: str = Field(..., description="Storage path")
    file_size_bytes: int = Field(..., ge=0, description="File size")
    taken_at: datetime = Field(..., description="Photo timestamp")
    location_on_vehicle: str = Field(..., description="Location on vehicle")
    damage_type_shown: List[DamageType] = Field(..., description="Types of damage visible")
    photographer: str = Field(..., description="Photographer name")
    photo_angle: str = Field(..., description="Photo angle/perspective")
    lighting_conditions: str = Field(..., description="Lighting conditions")
    
    @validator('photo_angle')
    def validate_photo_angle(cls, v):
        """Validate photo angle."""
        valid_angles = [
            'front', 'rear', 'left_side', 'right_side', 'top', 'bottom',
            'interior', 'close_up', 'wide_angle', 'detail'
        ]
        if v.lower() not in valid_angles:
            raise ValueError(f"Photo angle must be one of: {', '.join(valid_angles)}")
        return v.lower()
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v)
        }