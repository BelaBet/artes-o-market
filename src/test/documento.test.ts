import { describe, expect, it } from "vitest";
import { documentoValido, mascararDocumento } from "@/lib/documento";

describe("documentoValido", () => {
  it("aceita um CPF com dígitos verificadores corretos", () => {
    expect(documentoValido("111.444.777-35")).toBe(true);
  });

  it("rejeita um CPF com dígito verificador errado", () => {
    expect(documentoValido("111.444.777-36")).toBe(false);
  });

  it("rejeita CPFs com todos os dígitos iguais", () => {
    expect(documentoValido("111.111.111-11")).toBe(false);
  });

  it("aceita um CNPJ com dígitos verificadores corretos", () => {
    expect(documentoValido("11.444.777/0001-61")).toBe(true);
  });

  it("rejeita um CNPJ com dígito verificador errado", () => {
    expect(documentoValido("11.444.777/0001-62")).toBe(false);
  });

  it("rejeita tamanhos que não são nem CPF nem CNPJ", () => {
    expect(documentoValido("123")).toBe(false);
  });
});

describe("mascararDocumento", () => {
  it("formata como CPF até 11 dígitos", () => {
    expect(mascararDocumento("11144477735")).toBe("111.444.777-35");
  });

  it("formata como CNPJ a partir de 12 dígitos", () => {
    expect(mascararDocumento("11444777000161")).toBe("11.444.777/0001-61");
  });
});
