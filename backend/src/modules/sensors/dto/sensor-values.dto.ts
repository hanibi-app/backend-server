import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

const normalizeSensorValue = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && value === -999) {
    return null;
  }

  return value;
};

export class SensorValuesDto {
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'temperature는 숫자여야 합니다.' },
  )
  @Min(-40, { message: 'temperature는 -40 이상이어야 합니다.' })
  @Max(125, { message: 'temperature는 125 이하이어야 합니다.' })
  @IsOptional()
  @Transform(({ value }) => normalizeSensorValue(value))
  temperature: number | null;

  @IsNumber({}, { message: 'humidity는 정수여야 합니다.' })
  @Min(0, { message: 'humidity는 0 이상이어야 합니다.' })
  @Max(100, { message: 'humidity는 100 이하이어야 합니다.' })
  @IsOptional()
  @Transform(({ value }) => {
    const normalized = normalizeSensorValue(value);
    return normalized === null ? null : Math.round(normalized);
  })
  humidity: number | null;

  @IsNumber({}, { message: 'weight는 숫자여야 합니다.' })
  @Min(0, { message: 'weight는 0 이상이어야 합니다.' })
  @IsOptional()
  @Transform(({ value }) => normalizeSensorValue(value))
  weight?: number | null;

  @IsNumber({}, { message: 'gas는 숫자여야 합니다.' })
  @Min(0, { message: 'gas는 0 이상이어야 합니다.' })
  @Max(1000, { message: 'gas는 1000 이하이어야 합니다.' })
  @IsOptional()
  @Transform(({ value }) => normalizeSensorValue(value))
  gas?: number | null;

  @IsNumber({}, { message: 'error는 숫자여야 합니다.' })
  @Min(0, { message: 'error는 0 이상이어야 합니다.' })
  @Max(255, { message: 'error는 255 이하이어야 합니다.' })
  @IsOptional()
  @Transform(({ value }) => normalizeSensorValue(value))
  error?: number | null;
}

