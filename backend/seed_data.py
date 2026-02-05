#!/usr/bin/env python3
"""
Seed database with testing data for VW Crash-to-Repair Simulator.

Usage:
    cd backend
    poetry run python seed_data.py
"""

import asyncio
import json
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.models.base import Base
from src.models.vehicle import Vehicle
from src.models.part import Part
from src.models.dealer import Dealer
from src.models.damage import DamageReport, DamageComponent
from src.models.appointment import Appointment
from src.config import settings


# Test data definitions
VEHICLES_DATA = [
    {
        "model": "T-Cross",
        "year": 2024,
        "vin": "9BWUD41J24D000001",
        "beamng_model": "t-cross",
        "beamng_config": json.dumps({
            "parts": ["hood", "bumper", "fender"],
            "weight": 1200,
            "engine": "1.0L TSI"
        })
    },
    {
        "model": "T-Cross",
        "year": 2023,
        "vin": "9BWUD41J23D000002",
        "beamng_model": "t-cross",
        "beamng_config": json.dumps({
            "parts": ["hood", "bumper", "fender"],
            "weight": 1200,
            "engine": "1.0L TSI"
        })
    },
    {
        "model": "Polo",
        "year": 2024,
        "vin": "9BWUP21L24P000003",
        "beamng_model": "polo",
        "beamng_config": json.dumps({
            "parts": ["hood", "bumper", "door"],
            "weight": 1050,
            "engine": "1.6L MPI"
        })
    },
    {
        "model": "Polo",
        "year": 2023,
        "vin": "9BWUP21L23P000004",
        "beamng_model": "polo",
        "beamng_config": json.dumps({
            "parts": ["hood", "bumper", "door"],
            "weight": 1050,
            "engine": "1.6L MPI"
        })
    },
    {
        "model": "Golf",
        "year": 2024,
        "vin": "WVWZZZ3C74E000005",
        "beamng_model": "golf",
        "beamng_config": json.dumps({
            "parts": ["hood", "bumper", "door", "roof"],
            "weight": 1300,
            "engine": "1.4L TSI"
        })
    },
    {
        "model": "Jetta",
        "year": 2024,
        "vin": "3VWC21C54LM000006",
        "beamng_model": "jetta",
        "beamng_config": json.dumps({
            "parts": ["hood", "bumper", "fender", "door"],
            "weight": 1400,
            "engine": "1.4L TSI"
        })
    },
    {
        "model": "Tiguan",
        "year": 2024,
        "vin": "WVGZZZ3CZ4E000007",
        "beamng_model": "tiguan",
        "beamng_config": json.dumps({
            "parts": ["hood", "bumper", "fender", "door", "roof"],
            "weight": 1700,
            "engine": "2.0L TDI"
        })
    },
]

PARTS_DATA = [
    {
        "part_number": "561821021A",
        "name": "Front Bumper - T-Cross",
        "category": "Bumper",
        "vehicle_models": ["T-Cross"],
        "price_brl": Decimal("1200.00"),
        "labor_hours": Decimal("2.5"),
        "availability_status": "available",
        "supplier": "VW Original Parts",
        "description": "OEM front bumper assembly for T-Cross",
        "technical_specs": "Plastic reinforced bumper with integrated fog lights"
    },
    {
        "part_number": "561821022A",
        "name": "Rear Bumper - T-Cross",
        "category": "Bumper",
        "vehicle_models": ["T-Cross"],
        "price_brl": Decimal("950.00"),
        "labor_hours": Decimal("2.0"),
        "availability_status": "available",
        "supplier": "VW Original Parts",
        "description": "OEM rear bumper assembly for T-Cross",
        "technical_specs": "Plastic bumper with park distance control"
    },
    {
        "part_number": "6R0805588C",
        "name": "Hood - T-Cross/Polo",
        "category": "Hood",
        "vehicle_models": ["T-Cross", "Polo"],
        "price_brl": Decimal("800.00"),
        "labor_hours": Decimal("1.5"),
        "availability_status": "available",
        "supplier": "VW Original Parts",
        "description": "Aluminum hood assembly",
        "technical_specs": "Lightweight aluminum with gas struts"
    },
    {
        "part_number": "6R0821021A",
        "name": "Front Left Door - T-Cross",
        "category": "Door",
        "vehicle_models": ["T-Cross"],
        "price_brl": Decimal("2100.00"),
        "labor_hours": Decimal("3.5"),
        "availability_status": "available",
        "supplier": "VW Original Parts",
        "description": "Complete front left door assembly",
        "technical_specs": "With power window motor and lock mechanism"
    },
    {
        "part_number": "6R0821022A",
        "name": "Front Right Door - T-Cross",
        "category": "Door",
        "vehicle_models": ["T-Cross"],
        "price_brl": Decimal("2100.00"),
        "labor_hours": Decimal("3.5"),
        "availability_status": "available",
        "supplier": "VW Original Parts",
        "description": "Complete front right door assembly",
        "technical_specs": "With power window motor and lock mechanism"
    },
    {
        "part_number": "6R0821023A",
        "name": "Rear Left Door - T-Cross",
        "category": "Door",
        "vehicle_models": ["T-Cross"],
        "price_brl": Decimal("1900.00"),
        "labor_hours": Decimal("3.0"),
        "availability_status": "available",
        "supplier": "VW Original Parts",
        "description": "Complete rear left door assembly",
        "technical_specs": "With power window motor and child safety lock"
    },
    {
        "part_number": "6R0821024A",
        "name": "Rear Right Door - T-Cross",
        "category": "Door",
        "vehicle_models": ["T-Cross"],
        "price_brl": Decimal("1900.00"),
        "labor_hours": Decimal("3.0"),
        "availability_status": "available",
        "supplier": "VW Original Parts",
        "description": "Complete rear right door assembly",
        "technical_specs": "With power window motor and child safety lock"
    },
    {
        "part_number": "6R0821105A",
        "name": "Front Left Fender - T-Cross/Polo",
        "category": "Fender",
        "vehicle_models": ["T-Cross", "Polo"],
        "price_brl": Decimal("650.00"),
        "labor_hours": Decimal("2.0"),
        "availability_status": "available",
        "supplier": "VW Original Parts",
        "description": "Front left fender panel",
        "technical_specs": "Steel reinforced fender with primer coating"
    },
    {
        "part_number": "6R0821106A",
        "name": "Front Right Fender - T-Cross/Polo",
        "category": "Fender",
        "vehicle_models": ["T-Cross", "Polo"],
        "price_brl": Decimal("650.00"),
        "labor_hours": Decimal("2.0"),
        "availability_status": "available",
        "supplier": "VW Original Parts",
        "description": "Front right fender panel",
        "technical_specs": "Steel reinforced fender with primer coating"
    },
    {
        "part_number": "6R0807017A",
        "name": "Windshield - T-Cross",
        "category": "Glass",
        "vehicle_models": ["T-Cross", "Polo"],
        "price_brl": Decimal("1800.00"),
        "labor_hours": Decimal("2.5"),
        "availability_status": "available",
        "supplier": "Pilkington",
        "description": "Laminated front windshield with UV protection",
        "technical_specs": "Heated windshield with sensor for wipers"
    },
    {
        "part_number": "6R0803051A",
        "name": "Left Headlight Assembly - T-Cross",
        "category": "Lighting",
        "vehicle_models": ["T-Cross"],
        "price_brl": Decimal("2500.00"),
        "labor_hours": Decimal("1.5"),
        "availability_status": "available",
        "supplier": "VW Original Parts",
        "description": "LED headlight assembly with DRL",
        "technical_specs": "LED technology with automatic adjustment"
    },
    {
        "part_number": "6R0803052A",
        "name": "Right Headlight Assembly - T-Cross",
        "category": "Lighting",
        "vehicle_models": ["T-Cross"],
        "price_brl": Decimal("2500.00"),
        "labor_hours": Decimal("1.5"),
        "availability_status": "available",
        "supplier": "VW Original Parts",
        "description": "LED headlight assembly with DRL",
        "technical_specs": "LED technology with automatic adjustment"
    },
]

DEALERS_DATA = [
    {
        "name": "VW Autorizada São Paulo Centro",
        "cnpj": "01234567000100",
        "address": "Avenida Paulista, 1500",
        "city": "São Paulo",
        "state": "SP",
        "postal_code": "01311100",
        "phone": "(11) 3088-5000",
        "email": "contato@vw-sp-centro.com.br",
        "website": "https://www.vw-sp-centro.com.br",
        "latitude": Decimal("-23.5613"),
        "longitude": Decimal("-46.6560"),
        "services": ["inspection", "repair", "maintenance", "parts"],
        "specialties": ["T-Cross", "Polo", "Golf"],
        "working_hours": json.dumps({
            "monday": "08:00-18:00",
            "tuesday": "08:00-18:00",
            "wednesday": "08:00-18:00",
            "thursday": "08:00-18:00",
            "friday": "08:00-18:00",
            "saturday": "09:00-14:00",
            "sunday": "closed"
        }),
        "is_authorized": True,
        "is_active": True
    },
    {
        "name": "VW Autorizada São Paulo Zona Leste",
        "cnpj": "01234567000101",
        "address": "Avenida Brasil, 3000",
        "city": "São Paulo",
        "state": "SP",
        "postal_code": "03064000",
        "phone": "(11) 2965-1000",
        "email": "vendas@vw-sp-leste.com.br",
        "website": "https://www.vw-sp-leste.com.br",
        "latitude": Decimal("-23.5470"),
        "longitude": Decimal("-46.4788"),
        "services": ["inspection", "repair", "maintenance", "parts"],
        "specialties": ["T-Cross", "Polo", "Jetta", "Tiguan"],
        "working_hours": json.dumps({
            "monday": "08:00-19:00",
            "tuesday": "08:00-19:00",
            "wednesday": "08:00-19:00",
            "thursday": "08:00-19:00",
            "friday": "08:00-19:00",
            "saturday": "09:00-16:00",
            "sunday": "closed"
        }),
        "is_authorized": True,
        "is_active": True
    },
    {
        "name": "VW Autorizada Campinas",
        "cnpj": "01234567000102",
        "address": "Avenida Anchieta, 500",
        "city": "Campinas",
        "state": "SP",
        "postal_code": "13015130",
        "phone": "(19) 3237-2000",
        "email": "atendimento@vw-campinas.com.br",
        "website": "https://www.vw-campinas.com.br",
        "latitude": Decimal("-22.8954"),
        "longitude": Decimal("-47.0661"),
        "services": ["inspection", "repair", "maintenance"],
        "specialties": ["T-Cross", "Polo", "Golf"],
        "working_hours": json.dumps({
            "monday": "08:00-18:00",
            "tuesday": "08:00-18:00",
            "wednesday": "08:00-18:00",
            "thursday": "08:00-18:00",
            "friday": "08:00-18:00",
            "saturday": "09:00-13:00",
            "sunday": "closed"
        }),
        "is_authorized": True,
        "is_active": True
    },
    {
        "name": "VW Autorizada Belo Horizonte",
        "cnpj": "01234567000103",
        "address": "Avenida Brasil, 3000",
        "city": "Belo Horizonte",
        "state": "MG",
        "postal_code": "30140071",
        "phone": "(31) 3207-7000",
        "email": "vendas@vw-bh.com.br",
        "website": "https://www.vw-bh.com.br",
        "latitude": Decimal("-19.9241"),
        "longitude": Decimal("-43.9352"),
        "services": ["inspection", "repair", "maintenance", "parts"],
        "specialties": ["T-Cross", "Jetta", "Tiguan"],
        "working_hours": json.dumps({
            "monday": "08:00-18:00",
            "tuesday": "08:00-18:00",
            "wednesday": "08:00-18:00",
            "thursday": "08:00-18:00",
            "friday": "08:00-18:00",
            "saturday": "09:00-14:00",
            "sunday": "closed"
        }),
        "is_authorized": True,
        "is_active": True
    },
    {
        "name": "VW Autorizada Rio de Janeiro",
        "cnpj": "01234567000104",
        "address": "Avenida Rio Branco, 181",
        "city": "Rio de Janeiro",
        "state": "RJ",
        "postal_code": "20040020",
        "phone": "(21) 2131-1000",
        "email": "atendimento@vw-rj.com.br",
        "website": "https://www.vw-rj.com.br",
        "latitude": Decimal("-22.9068"),
        "longitude": Decimal("-43.1729"),
        "services": ["inspection", "repair", "maintenance", "parts"],
        "specialties": ["T-Cross", "Polo", "Golf", "Jetta"],
        "working_hours": json.dumps({
            "monday": "08:00-18:00",
            "tuesday": "08:00-18:00",
            "wednesday": "08:00-18:00",
            "thursday": "08:00-18:00",
            "friday": "08:00-18:00",
            "saturday": "09:00-14:00",
            "sunday": "closed"
        }),
        "is_authorized": True,
        "is_active": True
    },
]


async def seed_database():
    """Seed the database with test data."""
    # Create async engine
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        future=True,
    )

    # Create session factory
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        try:
            # Check if data already exists
            result = await session.execute(select(Vehicle))
            existing_vehicles = result.scalars().all()
            
            if existing_vehicles:
                print(f"✓ Database already has {len(existing_vehicles)} vehicles. Skipping seed...")
                return

            print("🌱 Seeding database with test data...")

            # Add vehicles
            print("  Adding vehicles...", end=" ")
            vehicles = []
            for vehicle_data in VEHICLES_DATA:
                vehicle = Vehicle(**vehicle_data)
                session.add(vehicle)
                vehicles.append(vehicle)
            await session.flush()
            print(f"✓ {len(vehicles)} vehicles added")

            # Add parts
            print("  Adding parts...", end=" ")
            parts = []
            for part_data in PARTS_DATA:
                part = Part(**part_data)
                session.add(part)
                parts.append(part)
            await session.flush()
            print(f"✓ {len(parts)} parts added")

            # Add dealers
            print("  Adding dealers...", end=" ")
            dealers = []
            for dealer_data in DEALERS_DATA:
                dealer = Dealer(**dealer_data)
                session.add(dealer)
                dealers.append(dealer)
            await session.flush()
            print(f"✓ {len(dealers)} dealers added")

            # Add damage reports (sample data)
            print("  Adding damage reports...", end=" ")
            damage_reports = []
            for i, vehicle in enumerate(vehicles[:3]):  # Only for first 3 vehicles
                damage_report = DamageReport(
                    vehicle_id=vehicle.id,
                    simulation_id=f"sim_test_{i+1}",
                    beamng_data={
                        "timestamp": datetime.utcnow().isoformat(),
                        "speed": 45 + (i * 10),
                        "impact_force": 1500 + (i * 500),
                        "vehicle_condition": "damaged"
                    },
                    overall_severity=["low", "medium", "high"][i]
                )
                session.add(damage_report)
                damage_reports.append(damage_report)
            await session.flush()
            print(f"✓ {len(damage_reports)} damage reports added")

            # Add damage components
            print("  Adding damage components...", end=" ")
            components_added = 0
            for i, damage_report in enumerate(damage_reports):
                component_severities = ["low", "medium", "high"][i:i+2]
                component_names = ["front_bumper", "hood", "left_fender"]
                
                for j, component_name in enumerate(component_names[:2]):
                    component = DamageComponent(
                        damage_report_id=damage_report.id,
                        component_name=component_name,
                        severity=component_severities[j % len(component_severities)],
                        damage_type="dent" if j % 2 == 0 else "crack",
                        repair_required=True,
                        replacement_required=(j % 3) == 0
                    )
                    session.add(component)
                    components_added += 1
            await session.flush()
            print(f"✓ {components_added} damage components added")

            # Add appointments
            print("  Adding appointments...", end=" ")
            appointments_added = 0
            for i in range(6):
                appointment = Appointment(
                    dealer_id=dealers[i % len(dealers)].id,
                    damage_report_id=damage_reports[i % len(damage_reports)].id if damage_reports else None,
                    customer_name=f"João Silva Test {i+1}",
                    customer_phone=f"(11) 9{8000+i}-{1000+i}",
                    customer_email=f"cliente{i+1}@test.com.br",
                    customer_cpf=f"123456789{i:03d}",
                    vehicle_vin=vehicles[i % len(vehicles)].vin,
                    vehicle_license_plate=f"VW{1000+i:05d}",
                    scheduled_date=datetime.utcnow() + timedelta(days=3+i),
                    estimated_duration_hours="2.5-3.5",
                    service_type=["inspection", "repair", "maintenance"][i % 3],
                    status=["scheduled", "confirmed"][i % 2],
                    notes=f"Test appointment {i+1}. Damaged vehicle from BeamNG simulation."
                )
                session.add(appointment)
                appointments_added += 1
            await session.flush()
            print(f"✓ {appointments_added} appointments added")

            # Commit all changes
            await session.commit()
            print("\n✅ Database seeding completed successfully!")
            print(f"\n📊 Summary:")
            print(f"   Vehicles: {len(vehicles)}")
            print(f"   Parts: {len(parts)}")
            print(f"   Dealers: {len(dealers)}")
            print(f"   Damage Reports: {len(damage_reports)}")
            print(f"   Damage Components: {components_added}")
            print(f"   Appointments: {appointments_added}")

        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error seeding database: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_database())
