"use server";

import { z } from 'zod';

const RucDniInput = z.string().refine(val => val.length === 8 || val.length === 11, {
  message: "El número debe tener 8 (DNI) u 11 (RUC) dígitos.",
});

export async function queryRucDni(numero: string) {
  try {
    const validatedNumero = RucDniInput.parse(numero);
    
    // Using the API endpoint from the user's code
    const response = await fetch('https://biluz-apiocr.vercel.app/api/query-api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            numeros: [validatedNumero]
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error en la respuesta de la API' }));
        // The API returns an array, so we access the first element's error message
        const errorMessage = errorData[0]?.nombre || `Error: ${response.status}`;
        throw new Error(errorMessage);
    }

    const data = await response.json();
    // The API returns an array, we are interested in the first result
    if (data && data.length > 0) {
      if (data[0].error) {
        throw new Error(data[0].nombre || 'Error en la consulta');
      }
      return { success: true, data: data[0] };
    } else {
      throw new Error('La API no devolvió resultados.');
    }

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred.' };
  }
}
