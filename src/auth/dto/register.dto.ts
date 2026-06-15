import { IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username: letters, digits, underscore only' })
  username!: string;

  @IsString()
  @Length(6, 32)
  password!: string;
}
