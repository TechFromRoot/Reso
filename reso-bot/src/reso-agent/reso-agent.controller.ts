import { Body, Controller, Post } from '@nestjs/common';
import { ResoAgentService } from './reso-agent.service';

@Controller('reso-agent')
export class ResoAgentController {
    constructor(private readonly resoService: ResoAgentService) { }

    @Post()
    swapToken(@Body() payload: { prompt: string }) {
        const privateKey =
            '';
        return this.resoService.swapToken(
            privateKey,
            payload.prompt
        );
    }

    @Post("create-token")
    createToken(@Body() payload: { name: string, uri: string, symbol: string, decimals: number, initialSupply: number }) {
        const privateKey =
            '';
        return this.resoService.createToken(
            privateKey, payload.name, payload.uri, payload.symbol, payload.decimals, payload.initialSupply
        );
    }
}