import { NextRequest, NextResponse } from 'next/server';
import { RouteOptimizerInput, StructuralRoute, OptimizedRouteOption } from '@/lib/route-optimizer/types';
import { generateStructuralRoutes } from '@/lib/route-optimizer/generateStructuralRoutes';
import { evaluateConcreteRoutes } from '@/lib/route-optimizer/evaluateConcreteRoutes';
import { rankOptimizedRoutes } from '@/lib/route-optimizer/rankOptimizedRoutes';
import { validateGroundRoute } from '@/lib/route-optimizer/groundRouteContract';

interface RouteOptimizerResponse {
  routes: OptimizedRouteOption[];
}

function validateInput(body: unknown): RouteOptimizerInput | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' };
  }

  const input = body as Partial<RouteOptimizerInput>;

  if (!input.originCity || typeof input.originCity !== 'string') {
    return { error: 'originCity is required and must be a string' };
  }

  if (!input.startDate || typeof input.startDate !== 'string') {
    return { error: 'startDate is required and must be an ISO date string' };
  }

  if (!input.endDate || typeof input.endDate !== 'string') {
    return { error: 'endDate is required and must be an ISO date string' };
  }

  if (!Array.isArray(input.stops) || input.stops.length === 0) {
    return { error: 'stops must be a non-empty array of cities' };
  }

  return input as RouteOptimizerInput;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateInput(body);

    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const input = validated as RouteOptimizerInput;

    // Step A: generate structural routes
    const structuralRoutes: StructuralRoute[] = await generateStructuralRoutes(input);
    console.log('[route-optimizer] Step A - structural routes generated:', structuralRoutes.length);
    
    // Validate ground routes (debug logging only)
    for (const route of structuralRoutes) {
      const violations = validateGroundRoute(
        route.groundRoute,
        input.stops || [],
        {
          outbound: route.outboundFlight,
          inbound: route.inboundFlight
        }
      );
      
      if (violations.length > 0) {
        console.debug('[DEBUG][GroundRouteValidation]', {
          routeId: route.id,
          violations: violations.map(v => ({
            type: v.type,
            message: v.message,
            context: v.context
          }))
        });
      }
    }
    
    // DIAGNOSTIC: Log structural routes and invalid status
    console.log("[DIAG][API] structuralRoutes count:", structuralRoutes.length);
    console.log(
      "[DIAG][API] structuralRoutes invalid IDs:",
      structuralRoutes
        .filter(r => r.itineraryImpact?.hardInvalidations?.some(inv => inv.reason === 'no-eligible-long-haul-anchor'))
        .map(r => r.id)
    );

    // Step 4: Confirm route is not filtered out - right before routes are filtered for hard invalidations
    for (const route of structuralRoutes) {
      console.debug("[DEBUG][RouteBeforeFiltering]", {
        routeId: route.id,
        groundRouteLength: route.groundRoute.length,
        hardInvalidations: route.itineraryImpact?.hardInvalidations || []
      });
    }

    // MANDATORY: Filter invalid routes BEFORE Step B
    // Invalid routes must NEVER call Duffel, be ranked, or appear in API response
    const validStructuralRoutes = structuralRoutes.filter((route) => {
      // Check for hard invalidations in itineraryImpact (any reason)
      const hasHardInvalidations = route.itineraryImpact?.hardInvalidations && 
        route.itineraryImpact.hardInvalidations.length > 0;
      
      if (hasHardInvalidations) {
        console.log(`[route-optimizer] Filtering out invalid route: ${route.id} (hard invalidation: ${route.itineraryImpact?.hardInvalidations?.map(inv => inv.reason).join(', ')})`);
        return false;
      }
      
      return true;
    });
    console.log('[route-optimizer] Valid structural routes after filtering:', validStructuralRoutes.length);
    
    // DIAGNOSTIC: Log valid structural routes
    console.log("[DIAG][API] validStructuralRoutes count:", validStructuralRoutes.length);
    console.log(
      "[DIAG][API] validStructuralRoutes IDs:",
      validStructuralRoutes.map(r => r.id)
    );

    // Step B: evaluate routes with concrete (Duffel) data
    // DIAGNOSTIC: Log routes passed to Step B
    console.log(
      "[DIAG][StepB] routes passed to Step B:",
      validStructuralRoutes.map(r => ({
        id: r.id,
        hasHardInvalidations: r.itineraryImpact?.hardInvalidations?.some(inv => inv.reason === 'no-eligible-long-haul-anchor') || false
      }))
    );
    const evaluatedRoutes = await evaluateConcreteRoutes(validStructuralRoutes);
    console.log('[route-optimizer] Step B - evaluated routes:', evaluatedRoutes.length);

    // Step C: rank evaluated routes into optimized options
    // DIAGNOSTIC: Log routes passed to Step C
    console.log(
      "[DIAG][StepC] routes passed to Step C:",
      evaluatedRoutes.map(r => ({
        id: r.structural.id,
        hasHardInvalidations: r.structural.itineraryImpact?.hardInvalidations?.some(inv => inv.reason === 'no-eligible-long-haul-anchor') || false
      }))
    );
    const routes: OptimizedRouteOption[] = rankOptimizedRoutes(evaluatedRoutes);
    console.log('[route-optimizer] Step C - optimized routes:', routes.length);

    const response: RouteOptimizerResponse = { routes };
    
    // DIAGNOSTIC: Log routes returned to client
    console.log(
      "[DIAG][API] routes returned to client:",
      routes.map(r => ({
        id: r.structural.id,
        hasHardInvalidations: r.structural.itineraryImpact?.hardInvalidations?.some(inv => inv.reason === 'no-eligible-long-haul-anchor') || false
      }))
    );

    // Step 5: Log final response mapping (last mile) - right before returning response
    for (const route of routes) {
      console.debug("[DEBUG][APIResponseGroundRoute]", {
        routeId: route.structural.id,
        groundRoute: route.structural.groundRoute
      });
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error in route-optimizer API route:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}






