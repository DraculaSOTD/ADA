from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import os
import tempfile
import json
import pandas as pd
from datetime import datetime
import io

from models import schemas, GeneratedData
from services import generator_service
from services.pattern_analyzer import PatternAnalyzer
from services.synthetic_data_generator import SyntheticDataGenerator
from core.database import get_db
from services.security import get_current_user

router = APIRouter(prefix="/api/generator", tags=["Generator"])

# Initialize services
pattern_analyzer = PatternAnalyzer()
data_generator = SyntheticDataGenerator()

def export_tables_to_sql(tables: Dict[str, pd.DataFrame]) -> str:
    """Export multiple tables to SQL script"""
    sql_script = []
    
    for table_name, df in tables.items():
        # Create table statement
        sql_script.append(f"-- Table: {table_name}")
        sql_script.append(f"CREATE TABLE {table_name} (")
        
        columns = []
        for col in df.columns:
            dtype = str(df[col].dtype)
            if 'int' in dtype:
                sql_type = 'INTEGER'
            elif 'float' in dtype:
                sql_type = 'FLOAT'
            elif 'bool' in dtype:
                sql_type = 'BOOLEAN'
            elif 'datetime' in dtype:
                sql_type = 'DATETIME'
            else:
                sql_type = 'VARCHAR(255)'
            columns.append(f"  {col} {sql_type}")
        
        sql_script.append(",\n".join(columns))
        sql_script.append(");")
        sql_script.append("")
        
        # Insert statements
        sql_script.append(f"-- Data for {table_name}")
        for _, row in df.iterrows():
            values = []
            for val in row:
                if pd.isna(val):
                    values.append("NULL")
                elif isinstance(val, str):
                    values.append(f"'{val}'")
                else:
                    values.append(str(val))
            sql_script.append(f"INSERT INTO {table_name} VALUES ({', '.join(values)});")
        
        sql_script.append("")
    
    return "\n".join(sql_script)

def export_tables_to_zip(tables: Dict[str, pd.DataFrame]) -> bytes:
    """Export multiple tables to ZIP file with CSV files"""
    import zipfile
    from io import BytesIO
    
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for table_name, df in tables.items():
            csv_data = df.to_csv(index=False)
            zip_file.writestr(f"{table_name}.csv", csv_data)
    
    return zip_buffer.getvalue()

def export_tables_to_json(tables: Dict[str, pd.DataFrame]) -> str:
    """Export multiple tables to JSON"""
    result = {}
    for table_name, df in tables.items():
        result[table_name] = df.to_dict('records')
    return json.dumps(result, indent=2)

@router.post("/", response_model=schemas.GeneratedData)
def create_generated_data(data: schemas.GeneratedDataCreate, db: Session = Depends(get_db)):
    """Legacy endpoint for backward compatibility"""
    return generator_service.create_generated_data(db=db, data=data)

@router.post("/analyze")
async def analyze_file(
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze uploaded file and detect patterns"""
    try:
        # Validate file type
        valid_extensions = ['.csv', '.json', '.xlsx', '.xls']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in valid_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Supported types: {', '.join(valid_extensions)}"
            )
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Analyze the file
            analysis_result = pattern_analyzer.analyze_file(tmp_file_path)
            
            # Store analysis in session or cache for later use
            # For now, we'll return it directly
            
            return JSONResponse(content=analysis_result)
            
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate")
async def generate_data(
    request: Dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate synthetic data based on patterns or configuration"""
    try:
        mode = request.get('mode', 'manual')
        num_rows = request.get('rows', 1000)
        output_format = request.get('format', 'csv')
        
        # Generate data based on mode
        if mode == 'pattern':
            # Pattern-based generation
            patterns = request.get('patterns', {})
            options = {
                'preserve_relationships': request.get('preserve_relationships', False),
                'include_outliers': request.get('include_outliers', False),
                'add_missing': request.get('add_missing', False),
                'relationships': request.get('relationships', {}),
                'differential_privacy': request.get('differential_privacy', False),
                'epsilon': request.get('epsilon', 1.0)
            }
            
            df = data_generator.generate_from_patterns(patterns, num_rows, options)
            
            # Apply privacy techniques if requested
            privacy_config = request.get('anonymization', {})
            if any(privacy_config.values()):
                df = data_generator.apply_privacy_techniques(df, privacy_config)
            
        elif mode == 'multi-table':
            # Multi-table generation
            tables_config = request.get('tables', [])
            relationships = request.get('relationships', [])
            options = request.get('options', {})
            
            tables = data_generator.generate_multi_table(tables_config, relationships, options)
            
            # Export multi-table data
            if output_format == 'sql':
                output_data = export_tables_to_sql(tables)
            elif output_format == 'csv-zip':
                output_data = export_tables_to_zip(tables)
            else:
                output_data = export_tables_to_json(tables)
            
            # Save and return (simplified for multi-table)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"multi_table_{timestamp}.{output_format}"
            file_path = os.path.join(tempfile.gettempdir(), filename)
            
            with open(file_path, 'wb' if isinstance(output_data, bytes) else 'w') as f:
                f.write(output_data)
            
            return {
                "success": True,
                "id": timestamp,
                "tables": len(tables),
                "format": output_format,
                "file_path": file_path
            }
            
        else:
            # Manual configuration
            columns = request.get('columns', [])
            data_type = request.get('data_type', 'mixed')
            
            df = data_generator.generate_from_config(columns, num_rows, data_type)
        
        # Export to requested format
        if output_format == 'csv':
            output_data = df.to_csv(index=False)
            file_ext = 'csv'
            content_type = 'text/csv'
        elif output_format == 'json':
            output_data = df.to_json(orient='records', indent=2)
            file_ext = 'json'
            content_type = 'application/json'
        elif output_format == 'excel':
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Generated Data')
            output_data = output.getvalue()
            file_ext = 'xlsx'
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else:
            raise ValueError(f"Unsupported format: {output_format}")
        
        # Save to file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"generated_data_{timestamp}.{file_ext}"
        file_path = os.path.join(tempfile.gettempdir(), filename)
        
        if isinstance(output_data, bytes):
            with open(file_path, 'wb') as f:
                f.write(output_data)
        else:
            with open(file_path, 'w') as f:
                f.write(output_data)
        
        # Calculate file size
        file_size = os.path.getsize(file_path)
        
        # Save to database
        db_data = GeneratedData(
            user_id=current_user.id,
            instance_name=request.get('name', f'Generated Data {timestamp}'),
            description=request.get('description', ''),
            rows=num_rows,
            columns=len(df.columns),
            file_size=file_size,
            token_cost=num_rows * len(df.columns),  # Simple estimation
            file_path=file_path,
            data_type=request.get('data_type', 'generated'),
            generation_config=json.dumps({
                'mode': mode,
                'format': output_format,
                'options': request
            })
        )
        
        db.add(db_data)
        db.commit()
        db.refresh(db_data)
        
        # Return success response
        return {
            'id': db_data.id,
            'rows': num_rows,
            'columns': len(df.columns),
            'file_size': file_size,
            'file_path': filename,
            'instance_name': db_data.instance_name
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_generation_history(
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get user's generation history"""
    try:
        history = db.query(GeneratedData)\
            .filter(GeneratedData.user_id == current_user.id)\
            .order_by(GeneratedData.created_at.desc())\
            .limit(limit)\
            .all()
        
        return {
            'history': [
                {
                    'id': item.id,
                    'instance_name': item.instance_name,
                    'description': item.description,
                    'rows': item.rows,
                    'columns': item.columns,
                    'file_size': item.file_size,
                    'created_at': item.created_at.isoformat(),
                    'data_type': item.data_type
                }
                for item in history
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{data_id}")
async def download_generated_data(
    data_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download generated data file"""
    try:
        # Get data record
        data_record = db.query(GeneratedData)\
            .filter(GeneratedData.id == data_id, GeneratedData.user_id == current_user.id)\
            .first()
        
        if not data_record:
            raise HTTPException(status_code=404, detail="Generated data not found")
        
        # Check if file exists
        if not os.path.exists(data_record.file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Determine content type
        file_ext = os.path.splitext(data_record.file_path)[1].lower()
        if file_ext == '.csv':
            media_type = 'text/csv'
        elif file_ext == '.json':
            media_type = 'application/json'
        elif file_ext in ['.xlsx', '.xls']:
            media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else:
            media_type = 'application/octet-stream'
        
        # Stream the file
        def iterfile():
            with open(data_record.file_path, 'rb') as f:
                yield from f
        
        filename = os.path.basename(data_record.file_path)
        
        return StreamingResponse(
            iterfile(),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preview/{data_id}")
async def preview_generated_data(
    data_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    rows: int = 10
):
    """Preview generated data"""
    try:
        # Get data record
        data_record = db.query(GeneratedData)\
            .filter(GeneratedData.id == data_id, GeneratedData.user_id == current_user.id)\
            .first()
        
        if not data_record:
            raise HTTPException(status_code=404, detail="Generated data not found")
        
        # Check if file exists
        if not os.path.exists(data_record.file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read file based on format
        file_ext = os.path.splitext(data_record.file_path)[1].lower()
        
        if file_ext == '.csv':
            df = pd.read_csv(data_record.file_path, nrows=rows)
        elif file_ext == '.json':
            with open(data_record.file_path, 'r') as f:
                data = json.load(f)
                if isinstance(data, list):
                    df = pd.DataFrame(data[:rows])
                else:
                    df = pd.DataFrame([data])
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(data_record.file_path, nrows=rows)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")
        
        # Convert to preview format
        preview = {
            'columns': list(df.columns),
            'rows': df.to_dict('records'),
            'total_rows': data_record.rows,
            'showing': len(df)
        }
        
        return preview
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{data_id}")
async def delete_generated_data(
    data_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete generated data"""
    try:
        # Get data record
        data_record = db.query(GeneratedData)\
            .filter(GeneratedData.id == data_id, GeneratedData.user_id == current_user.id)\
            .first()
        
        if not data_record:
            raise HTTPException(status_code=404, detail="Generated data not found")
        
        # Delete file if exists
        if os.path.exists(data_record.file_path):
            os.unlink(data_record.file_path)
        
        # Delete database record
        db.delete(data_record)
        db.commit()
        
        return {"message": "Generated data deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

